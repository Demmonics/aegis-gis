"""
AEGIS-GIS: Phase 11 Test Suite
Tests for End-to-End Autonomous Diagnostics, Self-Healing & Dry Run
Department of AI & DS, K.J. Somaiya College of Engineering
"""

import pytest
import socket
from fastapi.testclient import TestClient
from backend.main import app
from scripts.dry_run import (
    is_port_in_use,
    find_available_port,
    self_heal_backend_port,
    self_heal_database_mock,
)


@pytest.fixture
def client():
    return TestClient(app)


def test_health_alias_endpoint(client):
    """Verifies that GET /health returns 200 with healthy project status."""
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert "AEGIS-GIS" in data["project"]
    assert "services" in data


def test_predict_threat_diagnostic_endpoint(client):
    """Verifies that POST /api/ml/predict-threat returns threat prediction with mock telemetry."""
    payload = {
        "telemetry": {
            "cn0_mean": 38.5,
            "agc_level": 42.0,
            "doppler_shift": 120.0,
            "pseudorange_residual": 8.5
        }
    }
    res = client.post("/api/ml/predict-threat", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "predicted_class" in data or "predicted_threat" in data or "status" in data
    pred = data.get("predicted_class") or data.get("predicted_threat")
    assert pred in ["Normal", "Jamming", "Spoofing", "AUTHENTIC", "SIMPLISTIC_NON_SYNC", "SUCCESS"]


def test_simulations_scenarios_alias_endpoint(client):
    """Verifies that GET /api/simulations/scenarios returns available scenario tracks."""
    res = client.get("/api/simulations/scenarios")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert len(data["tracks"]) >= 4
    assert len(data["scenarios"]) >= 4


def test_find_available_port():
    """Verifies port detection and open port search."""
    # An ephemeral port in high range is almost certainly free
    test_port = find_available_port(29120)
    assert isinstance(test_port, int)
    assert test_port >= 29120


def test_port_detection_on_active_socket():
    """Verifies is_port_in_use correctly identifies an actively bound port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        bound_port = s.getsockname()[1]
        assert is_port_in_use(bound_port) is True

    # After socket closes, port should be free
    assert is_port_in_use(bound_port) is False


def test_self_heal_database_mock():
    """Verifies self-healing database fallback operates without error."""
    # Should not raise exception
    self_heal_database_mock()
