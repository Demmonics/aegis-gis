"""
Unit tests for Phase 3: GIS-Assisted Spoofing Detection, Section 8.4 Integrity Schema & PyQGIS Exporter
"""

import json
from pathlib import Path
import pytest

from backend.physics.scenarios import run_scenario
from backend.gis.spatial_topology_checker import GISSpatialTopologyChecker
from backend.gis.integrity_schema import IntegrityAwareGISBuilder
from backend.gis.pyqgis_exporter import export_qgis_bundle


class TestGISSpatialTopologyChecker:
    """Test Section 9 GIS-assisted spatial topology cross-checking."""

    def test_baltic_maritime_violation(self):
        checker = GISSpatialTopologyChecker()
        # Authentic open water coordinate
        v_auth = checker.evaluate_observation("baltic_maritime_c4ads", lon=19.85, lat=54.68)
        assert v_auth.passed is True

        # Spoofed position on Khrabrovo airport runway
        v_spoof = checker.evaluate_observation("baltic_maritime_c4ads", lon=20.592, lat=54.890)
        assert v_spoof.passed is False
        assert v_spoof.violation_type == "MARITIME_VESSEL_ON_LAND_RUNWAY"
        assert v_spoof.distance_from_valid_corridor_m > 5000.0

    def test_vilnius_aviation_violation(self):
        checker = GISSpatialTopologyChecker()
        # Authentic approach funnel
        v_auth = checker.evaluate_observation("vilnius_aviation_adsb", lon=25.320, lat=54.740)
        assert v_auth.passed is True

        # Lateral deviation outside approach funnel
        v_spoof = checker.evaluate_observation("vilnius_aviation_adsb", lon=25.180, lat=54.740)
        assert v_spoof.passed is False
        assert v_spoof.violation_type == "AVIATION_APPROACH_CORRIDOR_DEVIATION"

    def test_uav_lidar_geofence_violation(self):
        checker = GISSpatialTopologyChecker()
        # Inside survey grid
        v_auth = checker.evaluate_observation("uav_lidar_survey", lon=72.970, lat=18.960)
        assert v_auth.passed is True

        # Drifts outside geofence
        v_spoof = checker.evaluate_observation("uav_lidar_survey", lon=72.985, lat=18.960)
        assert v_spoof.passed is False
        assert v_spoof.violation_type == "UAV_SURVEY_CORRIDOR_DRIFT"
        assert v_spoof.impact_metric_value > 0

    def test_precision_ag_crop_row_violation(self):
        checker = GISSpatialTopologyChecker()
        # On crop row centerline (inter-row tolerance < 25cm)
        v_auth = checker.evaluate_observation("precision_ag_tractor", lon=73.7900, lat=20.0105)
        assert v_auth.passed is True

        # Lateral shift of 2.8 meters (0.000028 deg) directly into grapevine trellis
        v_spoof = checker.evaluate_observation("precision_ag_tractor", lon=73.790028, lat=20.0105)
        assert v_spoof.passed is False
        assert v_spoof.violation_type == "AGRICULTURE_CROP_ROW_COLLISION_RISK"
        assert v_spoof.distance_from_valid_corridor_m > 1.0


class TestIntegritySchemaBuilder:
    """Test Section 8.4 GeoJSON serialization and Downstream Impact Assessment."""

    def test_geojson_schema_strictness(self):
        builder = IntegrityAwareGISBuilder()
        run = run_scenario("baltic_maritime_c4ads", total_epochs=60)
        geojson = builder.build_geojson_collection(run)

        assert geojson["type"] == "FeatureCollection"
        assert "features" in geojson
        assert len(geojson["features"]) >= 63 # 60 points + 3 trajectories + polygons

        # Find point features
        points = [f for f in geojson["features"] if f["geometry"]["type"] == "Point"]
        assert len(points) == 60

        # Check all 12 mandatory Section 8.4 integrity fields on the first point
        p0 = points[0]["properties"]
        mandatory_fields = [
            "observation_id",
            "scenario_id",
            "receiver_type",
            "constellations_tracked",
            "timestamp_utc",
            "crs_epsg",
            "utm_projection",
            "estimated_accuracy_m",
            "pdop",
            "satellite_count",
            "cn0_dbhz",
            "correction_status",
            "authentication_status",
            "integrity_status",
            "independent_sensor_validated",
            "gis_topology_check",
            "ml_classification",
            "mitigated_recovery_geometry"
        ]
        for field in mandatory_fields:
            assert field in p0, f"Missing Section 8.4 field: {field}"

        # Find the 3 line features
        line_names = [f["properties"].get("name") for f in geojson["features"] if f["geometry"]["type"] == "LineString"]
        assert "REPORTED_SPOOFED_TRAJECTORY" in line_names
        assert "GROUND_TRUTH_TRAJECTORY" in line_names
        assert "AEGIS_EKF_RECOVERED_TRAJECTORY" in line_names

    def test_downstream_impact_report(self):
        builder = IntegrityAwareGISBuilder()
        run = run_scenario("baltic_maritime_c4ads", total_epochs=60)
        report = builder.generate_downstream_impact_report(run)

        assert report.scenario_id == "baltic_maritime_c4ads"
        assert report.total_epochs == 60
        assert report.spoofed_epochs_count > 0

        # Legacy pipeline should have high RMSE due to 14km jump
        assert report.legacy_unprotected_pipeline["positional_rmse_meters"] > 1000.0
        assert report.legacy_unprotected_pipeline["quarantine_success_rate_pct"] == 0.0

        # AEGIS pipeline should have low RMSE and 100% quarantine rate
        assert report.aegis_integrity_aware_pipeline["positional_rmse_meters"] < 25.0
        assert report.aegis_integrity_aware_pipeline["quarantine_success_rate_pct"] == 100.0


class TestPyQGISExporter:
    """Test automated PyQGIS load script and QML style generator."""

    def test_export_qgis_bundle_disk_persistence(self, tmp_path):
        bundle = export_qgis_bundle(scenario_id="baltic_maritime_c4ads", output_dir=tmp_path)

        assert Path(bundle["points_geojson"]).exists()
        assert Path(bundle["trajectories_geojson"]).exists()
        assert Path(bundle["pyqgis_script"]).exists()
        assert Path(bundle["qml_style"]).exists()

        # Check script content
        script_text = Path(bundle["pyqgis_script"]).read_text(encoding="utf-8")
        assert "QgsRuleBasedRenderer" in script_text
        assert "QgsVectorLayer" in script_text
        assert "VERIFIED_AUTHENTIC" in script_text

        # Check QML content
        qml_text = Path(bundle["qml_style"]).read_text(encoding="utf-8")
        assert "<qgis" in qml_text
        assert "RuleRenderer" in qml_text
