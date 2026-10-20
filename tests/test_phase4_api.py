"""
Unit tests for Phase 4: FastAPI Endpoints, Qdrant Vector RAG, and AI Forensic Copilot
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestPhase4API:
    """Test all 7 core API endpoints of AEGIS-GIS."""

    def test_health_endpoint(self):
        res = client.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "HEALTHY"
        assert len(data["authors"]) == 4
        assert "services" in data
        assert data["services"]["physics_engine"] == "ACTIVE"
        assert data["services"]["ml_classifier_ensemble"]["status"] == "ONLINE"

    def test_scenarios_endpoint(self):
        res = client.get("/api/scenarios")
        assert res.status_code == 200
        data = res.json()
        assert data["total_scenarios"] == 4
        sc_ids = [s["scenario_id"] for s in data["scenarios"]]
        assert "baltic_maritime_c4ads" in sc_ids
        assert "vilnius_aviation_adsb" in sc_ids
        assert "uav_lidar_survey" in sc_ids
        assert "precision_ag_tractor" in sc_ids

    def test_simulate_endpoint(self):
        payload = {
            "scenario_id": "baltic_maritime_c4ads",
            "override_attack_type": "INTERMEDIATE_SYNC",
            "spoof_power_advantage_db": 3.0,
            "enable_ekf_mitigation": True,
            "total_epochs": 20
        }
        res = client.post("/api/simulate", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["total_epochs"] == 20
        assert len(data["telemetry_epochs"]) == 20
        assert len(data["layered_defense_records"]) == 20
        assert "integrity_aware_geojson" in data
        assert "downstream_impact_assessment" in data

    def test_ml_diagnostics_endpoint(self):
        res = client.get("/api/ml/diagnostics")
        assert res.status_code == 200
        data = res.json()
        metrics = data["evaluation_metrics"]
        assert metrics["overall_accuracy"] >= 0.96
        assert len(metrics["confusion_matrix"]) == 7
        assert len(data["table_2_comparison"]) >= 5

    def test_forensic_analyze_endpoint(self):
        payload = {
            "scenario_title": "Baltic Sea Maritime Tanker",
            "attack_type": "INTERMEDIATE_SYNC",
            "query": "Explain how the EKF sensor fusion and GIS topology stops this attack",
            "telemetry_features": {
                "cn0_mean_dbhz": 48.5,
                "sqm_delta_asymmetry": -0.32,
                "clock_bias_jump_m": 25.0,
                "ekf_innovation_mahalanobis": 32.0,
                "doa_azimuth_variance_deg": 5.5
            }
        }
        res = client.post("/api/forensic/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "analysis_markdown" in data
        assert len(data["analysis_markdown"]) > 50
        assert "model_telemetry" in data
        assert "qdrant_citations" in data
        assert len(data["qdrant_citations"]) >= 1

    def test_gis_export_endpoint(self):
        res = client.get("/api/gis/export/baltic_maritime_c4ads")
        assert res.status_code == 200
        data = res.json()
        assert "files_generated" in data
        assert "pyqgis_script_content" in data
        assert "QgsRuleBasedRenderer" in data["pyqgis_script_content"]
        assert "qml_style_content" in data

    def test_paper_knowledge_endpoint(self):
        res = client.get("/api/paper/knowledge")
        assert res.status_code == 200
        data = res.json()
        assert "When Location Lies" in data["paper_title"]
        assert len(data["team_members"]) == 4
        assert data["indexed_chunks_count"] == 18

        # Test knowledge query
        res_q = client.get("/api/paper/knowledge?query=drift-evasive+uav+lidar")
        assert res_q.status_code == 200
        data_q = res_q.json()
        assert len(data_q["matches"]) >= 1
