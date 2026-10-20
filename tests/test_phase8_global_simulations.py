"""
AEGIS-GIS: Phase 8 Test Suite - Global Incident Simulation Engine & Multi-Scenario Playback
Verifies Section 5 Real-World Case Studies across 4 Domains:
1. Aviation (Vilnius Landing Abort - 2025)
2. Maritime (Baltic Sea C4ADS - 2024)
3. UAV/Drone (Drift-Evasive Spoofing - Panda & Guo 2025)
4. Precision Agriculture (Nashik RTK Vineyard Tractor)
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.simulations.scenario_engine import (
    GlobalScenarioEngine,
    get_all_simulation_tracks,
    get_simulation_track
)

client = TestClient(app)


def test_scenario_engine_generation_all_domains(tmp_path):
    """Verifies that GlobalScenarioEngine produces valid 60-epoch data for all 4 domains."""
    engine = GlobalScenarioEngine(output_dir=tmp_path)
    
    # 1. Aviation
    av = engine.generate_aviation_vilnius(total_epochs=60)
    assert av["scenario_id"] == "aviation_vilnius"
    assert av["domain"] == "aviation"
    assert av["vehicle_type"] == "airplane"
    assert len(av["epochs"]) == 60
    assert av["epochs"][0]["altitude_m"] == 1200.0
    assert av["epochs"][25]["is_attack_active"] is True
    assert av["epochs"][25]["alert_message"] is not None
    assert av["epochs"][59]["altitude_m"] > 2000.0  # Climbed back on go-around

    # 2. Maritime
    mar = engine.generate_maritime_baltic(total_epochs=60)
    assert mar["scenario_id"] == "maritime_baltic"
    assert mar["domain"] == "maritime"
    assert mar["vehicle_type"] == "ship"
    assert len(mar["epochs"]) == 60
    assert mar["epochs"][0]["is_attack_active"] is False
    assert mar["epochs"][35]["is_attack_active"] is True
    assert mar["epochs"][35]["position_drift_m"] > 5000.0  # Teleported inland

    # 3. UAV Drone
    uav = engine.generate_uav_drift(total_epochs=60)
    assert uav["scenario_id"] == "uav_drift"
    assert uav["domain"] == "uav"
    assert uav["vehicle_type"] == "drone"
    assert len(uav["epochs"]) == 60
    assert uav["epochs"][5]["is_attack_active"] is False
    assert uav["epochs"][30]["is_attack_active"] is True
    assert uav["epochs"][45]["position_drift_m"] > 10.0  # Drifted past geofence

    # 4. Precision Agriculture
    agri = engine.generate_agri_tractor(total_epochs=60)
    assert agri["scenario_id"] == "agri_tractor"
    assert agri["domain"] == "agriculture"
    assert agri["vehicle_type"] == "tractor"
    assert len(agri["epochs"]) == 60
    assert agri["epochs"][10]["is_attack_active"] is False
    assert agri["epochs"][25]["is_attack_active"] is True
    assert agri["epochs"][25]["position_drift_m"] > 0.5  # Exceeded 0.25m RTK tolerance


def test_scenario_rf_and_telemetry_integrity():
    """Validates that physical RF signals (C/N0, AGC, DoA) conform to paper Section 6 physics."""
    track = get_simulation_track("aviation_vilnius")
    epochs = track["epochs"]

    for e in epochs:
        # Check coordinates validity
        assert len(e["true_pos"]) == 2
        assert len(e["spoofed_pos"]) == 2
        assert len(e["ekf_pos"]) == 2
        assert -90 <= e["true_pos"][0] <= 90
        assert -180 <= e["true_pos"][1] <= 180

        # Physical layer bounds
        assert 20.0 <= e["inferred_cn0"] <= 70.0
        assert -100.0 <= e["agc_attenuation_db"] <= 0.0
        assert e["doa_azimuth_var"] >= 0.0

    # Inferred C/N0 drops when attack starts (as specified in Phase 8 prompt)
    pre_attack = epochs[10]
    attack = epochs[22]
    assert attack["is_attack_active"] is True
    assert attack["inferred_cn0"] < pre_attack["inferred_cn0"]


def test_api_list_simulation_tracks():
    """Verifies GET /api/simulations/tracks returns 4 scenarios with metadata."""
    response = client.get("/api/simulations/tracks")
    assert response.status_code == 200
    tracks = response.json()
    assert len(tracks) == 4
    
    track_ids = [t["id"] for t in tracks]
    assert "aviation_vilnius" in track_ids
    assert "maritime_baltic" in track_ids
    assert "uav_drift" in track_ids
    assert "agri_tractor" in track_ids


def test_api_fetch_individual_simulation_tracks():
    """Verifies GET /api/simulations/{scenario_id} returns 60-epoch payload for each track."""
    for s_id in ["aviation_vilnius", "maritime_baltic", "uav_drift", "agri_tractor"]:
        response = client.get(f"/api/simulations/{s_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["scenario_id"] == s_id
        assert "epochs" in data
        assert len(data["epochs"]) == 60
        assert "spoofer_location" in data
        assert "narrative_phases" in data
        assert "gis_polygons" in data


def test_api_fetch_nonexistent_track_returns_404():
    """Verifies that querying an unknown scenario returns 404."""
    response = client.get("/api/simulations/unknown_spacecraft_attack")
    assert response.status_code == 404
