"""
Unit tests for Phase 1: GNSS Coordinates, Physics Simulator & 4 Real-World Scenarios
"""

import math
import numpy as np
import pytest

from backend.physics.coordinates import (
    geodetic_to_ecef,
    ecef_to_geodetic,
    geodetic_to_utm,
    solve_wls_pvt,
)
from backend.physics.signal_simulator import (
    SpoofingAttackType,
    GNSSSignalSimulator,
)
from backend.physics.scenarios import (
    ScenarioManager,
    SCENARIO_METADATA_REGISTRY,
    run_scenario,
)


class TestCoordinates:
    """Test WGS-84, ECEF, UTM coordinate math and WLS PVT solver."""

    @pytest.mark.parametrize("lat,lon,alt", [
        (19.0760, 72.8777, 14.0),     # Mumbai, India
        (54.6872, 25.2797, 112.0),    # Vilnius, Lithuania
        (54.3520, 18.6466, 5.0),      # Gdansk, Poland
        (0.0, 0.0, 0.0),              # Equator/Prime Meridian
        (85.0, 45.0, 500.0),          # High latitude
    ])
    def test_geodetic_ecef_roundtrip(self, lat, lon, alt):
        """Verify round-trip accuracy is within 1e-4 meters (0.1 mm)."""
        x, y, z = geodetic_to_ecef(lat, lon, alt)
        lat_back, lon_back, alt_back = ecef_to_geodetic(x, y, z)

        assert abs(lat - lat_back) < 1e-7, f"Lat mismatch: {lat} vs {lat_back}"
        assert abs(lon - lon_back) < 1e-7, f"Lon mismatch: {lon} vs {lon_back}"
        assert abs(alt - alt_back) < 1e-3, f"Alt mismatch: {alt} vs {alt_back}"

        # Distance error
        x2, y2, z2 = geodetic_to_ecef(lat_back, lon_back, alt_back)
        dist_err = math.sqrt((x - x2)**2 + (y - y2)**2 + (z - z2)**2)
        assert dist_err < 1e-4, f"Round-trip distance error too large: {dist_err} m"

    def test_utm_projection(self):
        """Verify UTM conversion returns valid zone and positive easting/northing."""
        # Mumbai UTM Zone 43N
        utm_mumbai = geodetic_to_utm(19.0760, 72.8777)
        assert utm_mumbai["zone"] == "43N"
        assert utm_mumbai["epsg"] == "EPSG:32643"
        assert 100000.0 < utm_mumbai["easting_m"] < 900000.0
        assert utm_mumbai["northing_m"] > 0

        # Vilnius UTM Zone 35N
        utm_vilnius = geodetic_to_utm(54.6872, 25.2797)
        assert utm_vilnius["zone"] == "35N"
        assert utm_vilnius["epsg"] == "EPSG:32635"

    def test_solve_wls_pvt(self):
        """Verify Gauss-Newton PVT solver recovers position from synthetic satellite geometry."""
        # Receiver at Mumbai
        true_x, true_y, true_z = geodetic_to_ecef(19.0760, 72.8777, 10.0)
        true_clock_bias = 45.2 # meters

        # 6 synthetic satellites in MEO orbit (~20,200 km)
        sat_coords = [
            (true_x + 15e6, true_y + 8e6, true_z + 18e6),
            (true_x - 14e6, true_y + 12e6, true_z + 16e6),
            (true_x + 9e6, true_y - 17e6, true_z + 15e6),
            (true_x - 12e6, true_y - 14e6, true_z + 19e6),
            (true_x + 3e6, true_y + 19e6, true_z + 14e6),
            (true_x - 18e6, true_y + 2e6, true_z + 17e6),
        ]
        sat_pos = np.array(sat_coords, dtype=np.float64)

        # Compute true ranges + clock bias
        diff = sat_pos - np.array([true_x, true_y, true_z])
        ranges = np.linalg.norm(diff, axis=1)
        pr = ranges + true_clock_bias

        res = solve_wls_pvt(sat_pos, pr, initial_guess=np.array([true_x + 200, true_y - 150, true_z + 80, 0.0]))

        assert res["converged"] is True
        rec_ecef = res["receiver_ecef"]
        pos_err = math.sqrt((rec_ecef[0] - true_x)**2 + (rec_ecef[1] - true_y)**2 + (rec_ecef[2] - true_z)**2)
        assert pos_err < 0.05, f"WLS position error too large: {pos_err} m"
        assert abs(res["clock_bias_m"] - true_clock_bias) < 0.05
        assert res["dop"]["pdop"] > 0
        assert res["residual_rms_m"] < 0.05


class TestSignalSimulator:
    """Test the 6-attack RF signal and correlator simulator."""

    def test_correlator_tap_profiles(self):
        """Verify authentic peak symmetry vs spoofer distortion."""
        sim = GNSSSignalSimulator(seed=123)

        auth_taps = sim.generate_correlator_profile(SpoofingAttackType.AUTHENTIC)
        assert len(auth_taps.delays_chips) == 41
        assert abs(auth_taps.delta_asymmetry) < 0.08, "Authentic delta asymmetry should be near zero"
        assert 0.8 < auth_taps.ratio_metric < 1.25

        # Intermediate sync should produce distinctive peak asymmetry
        sync_taps = sim.generate_correlator_profile(
            SpoofingAttackType.INTERMEDIATE_SYNC,
            spoofer_delay_chips=0.35,
            spoofer_power_ratio=1.4
        )
        assert abs(sync_taps.delta_asymmetry) > 0.15, "Intermediate sync must show early-late distortion"

    @pytest.mark.parametrize("attack_type", list(SpoofingAttackType))
    def test_telemetry_features_all_attacks(self, attack_type):
        """Verify all 7 attack classes generate valid 14-dimensional feature vectors."""
        sim = GNSSSignalSimulator(seed=42)
        telem = sim.generate_epoch_telemetry(
            epoch=5,
            attack_type=attack_type,
            true_lat=54.68,
            true_lon=19.85,
            true_alt=10.0
        )

        assert len(telem.feature_vector) == 14
        assert len(telem.features_14d) == 14
        assert len(telem.satellites) >= 8

        # Check attack specific characteristics
        if attack_type == SpoofingAttackType.AUTHENTIC:
            assert 40.0 <= telem.features_14d["cn0_mean_dbhz"] <= 48.0
            assert telem.features_14d["clock_bias_jump_m"] < 10.0
        elif attack_type == SpoofingAttackType.SIMPLISTIC_NON_SYNC:
            assert telem.features_14d["cn0_mean_dbhz"] > 50.0
            assert telem.features_14d["clock_bias_jump_m"] > 200.0
        elif attack_type == SpoofingAttackType.NULLING_SUPPRESSION:
            assert telem.features_14d["cn0_mean_dbhz"] < 39.0


class TestScenarios:
    """Test the 4 real-world GNSS spoofing case study scenarios."""

    @pytest.mark.parametrize("scenario_id", list(SCENARIO_METADATA_REGISTRY.keys()))
    def test_scenario_run_execution(self, scenario_id):
        """Verify each scenario produces 60 epochs with ground truth, reported, and recovered paths."""
        run = run_scenario(scenario_id, total_epochs=60)

        assert run.total_epochs == 60
        assert len(run.ground_truth_path) == 60
        assert len(run.reported_spoofed_path) == 60
        assert len(run.ekf_recovered_path) == 60
        assert len(run.telemetry) == 60

        # Check GeoJSON reference polygons
        assert run.gis_reference_geojson["type"] == "FeatureCollection"
        assert len(run.gis_reference_geojson["features"]) >= 1

        # Check attack onset
        attack_epoch = run.metadata.attack_start_epoch
        # Before attack: reported coords equal ground truth
        p_pre_true = run.ground_truth_path[attack_epoch - 1]
        p_pre_spoofed = run.reported_spoofed_path[attack_epoch - 1]
        assert p_pre_true == p_pre_spoofed

        # At the end of the attack: reported coords have diverged from ground truth
        p_end_true = run.ground_truth_path[59]
        p_end_spoofed = run.reported_spoofed_path[59]
        diff_deg = math.hypot(p_end_true[0] - p_end_spoofed[0], p_end_true[1] - p_end_spoofed[1])
        assert diff_deg > 0.00001, "Spoofed track must diverge from ground truth during attack"

        # EKF recovered path remains close to ground truth
        p_end_rec = run.ekf_recovered_path[59]
        ekf_err = math.hypot(p_end_true[0] - p_end_rec[0], p_end_true[1] - p_end_rec[1])
        assert ekf_err < diff_deg, "EKF recovered path must be closer to ground truth than spoofed track"
