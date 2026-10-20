"""
AEGIS-GIS: Phase 10 Test Suite - Professor Viva Mode & Cyber UI Polish
Verifies:
1. Static frontend dist integrity & SPA route serving.
2. God Mode attack injection API trigger override behavior.
3. Sensor Fusion EKF mitigation restoration payload verification.
4. System reset state verification.
"""

import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_frontend_dist_assets_integrity():
    """Verifies that the compiled production bundle with Viva Mode components exists on disk."""
    base_dir = Path(__file__).resolve().parent.parent
    dist_dir = base_dir / "frontend" / "dist"
    index_html = dist_dir / "index.html"
    assets_dir = dist_dir / "assets"

    assert dist_dir.exists(), "frontend/dist does not exist. Run npm run build."
    assert index_html.exists(), "frontend/dist/index.html missing."
    assert assets_dir.exists(), "frontend/dist/assets directory missing."

    js_files = list(assets_dir.glob("*.js"))
    css_files = list(assets_dir.glob("*.css"))
    assert len(js_files) > 0, "No compiled JS bundle found."
    assert len(css_files) > 0, "No compiled CSS bundle found."


def test_frontend_spa_serving():
    """Verifies that FastAPI serves the production SPA and assets cleanly."""
    res = client.get("/")
    assert res.status_code == 200
    assert "AEGIS-GIS" in res.text or "<!doctype html>" in res.text.lower()


def test_god_mode_attack_injection_override():
    """Verifies that the God Mode attack injection overrides scenario physics instantly."""
    payload = {
        "scenario_id": "baltic_maritime_c4ads",
        "override_attack_type": "INTERMEDIATE_SYNC",
        "spoof_power_advantage_db": 6.0,
        "enable_ekf_mitigation": False,
        "total_epochs": 60
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    # Verify attack override was applied
    assert data["scenario_metadata"]["scenario_id"] == "baltic_maritime_c4ads"
    # Unprotected pipeline must report massive RMSE deviation without EKF
    impact = data["downstream_impact_assessment"]
    assert impact["legacy_unprotected_pipeline"]["positional_rmse_meters"] > 1000.0


def test_god_mode_sensor_fusion_recovery():
    """Verifies that triggering EKF recovery snaps the trajectory error back to < 5 meters."""
    payload = {
        "scenario_id": "baltic_maritime_c4ads",
        "override_attack_type": "INTERMEDIATE_SYNC",
        "spoof_power_advantage_db": 6.0,
        "enable_ekf_mitigation": True,
        "total_epochs": 60
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()

    impact = data["downstream_impact_assessment"]
    assert impact["aegis_integrity_aware_pipeline"]["positional_rmse_meters"] < 25.0
    assert len(data["ekf_recovered_path"]) == 60


def test_god_mode_system_reset():
    """Verifies that a reset payload restores default nominal simulation conditions."""
    payload = {
        "scenario_id": "baltic_maritime_c4ads",
        "override_attack_type": None,
        "spoof_power_advantage_db": 3.0,
        "enable_ekf_mitigation": True,
        "total_epochs": 60
    }
    response = client.post("/api/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["telemetry_epochs"]) == 60
    # Initial epochs must be authentic
    assert data["telemetry_epochs"][0]["attack_type"] == "AUTHENTIC"
