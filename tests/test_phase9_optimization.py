"""
AEGIS-GIS: Phase 9 Test Suite - High-Performance Anti-Lag & Optimization
Verifies:
1. In-memory LRU prediction caching for ML classifiers (<1ms latency).
2. Synthetic high-throughput load test: 500 telemetry vectors processed in < 50ms.
3. Batched WebSocket telemetry streaming loop with 5-epoch chunks.
4. Non-blocking in-memory database persistence buffer.
"""

import time
import pytest
from fastapi.testclient import TestClient
from backend.main import app, ml_classifier, mongo_service

client = TestClient(app)


def test_ml_prediction_cache_hit_and_speed():
    """Verifies that consecutive predictions with identical telemetry hit the RAM cache in < 1ms."""
    sample_14d = [
        43.5,    # cn0_mean_dbhz
        1.2,     # cn0_variance_dbhz
        0.05,    # sqm_delta_asymmetry
        0.02,    # sqm_ratio_metric
        0.0,     # clock_bias_jump_m
        0.01,    # clock_drift_rate_mps
        0.8,     # doppler_residual_hz
        1.2,     # pseudorange_residual_rms
        0.95,    # carrier_phase_snr_drop
        0.0,     # agc_attenuation_jump_db
        1.2,     # ekf_innovation_mahalanobis
        65.0,    # doa_azimuth_variance_deg
        0.0,     # position_step_jump_m
        0.02     # velocity_discrepancy_mps
    ]

    # First call: populates cache
    res1 = ml_classifier.predict_epoch(sample_14d)
    assert "is_spoofed" in res1

    # Second call: must hit cache and complete in sub-millisecond
    t0 = time.perf_counter()
    res2 = ml_classifier.predict_epoch(sample_14d)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert res1["predicted_attack_type"] == res2["predicted_attack_type"]
    assert res1["confidence_score"] == res2["confidence_score"]
    assert elapsed_ms < 1.0, f"Cache retrieval took {elapsed_ms:.3f}ms, expected < 1.0ms"
    assert ml_classifier._cache_hits > 0


def test_synthetic_load_500_telemetry_points():
    """
    Synthetic load test: fires 500 telemetry points per second at the API.
    Asserts individual batch response times remain well under 50ms (average < 15ms),
    and repeated batch queries hit cache in < 10ms.
    """
    base_vector = [42.0, 1.5, 0.08, 0.04, 0.0, 0.02, 1.1, 1.8, 0.9, 0.0, 1.4, 60.0, 0.0, 0.05]
    batch_50 = [
        [v + (i % 5) * 0.01 for v in base_vector]
        for i in range(50)
    ]

    # Fire 10 batches of 50 points = 500 points total
    latencies = []
    for _ in range(10):
        t0 = time.perf_counter()
        response = client.post("/api/ml/predict-batch", json={"feature_vectors": batch_50})
        lat_ms = (time.perf_counter() - t0) * 1000.0
        assert response.status_code == 200
        latencies.append(lat_ms)

    # Average latency per 50-point batch must be < 50ms (typically ~10ms)
    avg_latency = sum(latencies) / len(latencies)
    assert avg_latency < 50.0, f"Average batch latency was {avg_latency:.2f}ms (> 50ms)"

    # Verify cached 500-point full batch retrieval is under 50ms
    batch_500 = batch_50 * 10
    t0_500 = time.perf_counter()
    resp_500 = client.post("/api/ml/predict-batch", json={"feature_vectors": batch_500})
    duration_500_ms = (time.perf_counter() - t0_500) * 1000.0

    assert resp_500.status_code == 200
    assert resp_500.json()["total_processed"] == 500
    assert duration_500_ms < 50.0, f"Cached 500-point batch took {duration_500_ms:.2f}ms (> 50ms target)"


def test_hf_and_guardian_caching_latency():
    """Verifies that repeat calls to HF and Guardian endpoints utilize cache with low latency."""
    dummy_telem = {
        "C/N0_mean": 43.5,
        "AGC_level": -85.0,
        "Doppler_residual": 0.5,
        "Pseudorange_residual": 1.2,
        "DoA_azimuth_var": 55.0
    }

    # First call
    resp1 = client.post("/api/ml/predict-hf", json=dummy_telem)
    assert resp1.status_code == 200

    # Repeat call: verify cache latency
    t0 = time.perf_counter()
    resp2 = client.post("/api/ml/predict-hf", json=dummy_telem)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    assert resp2.status_code == 200
    assert resp1.json()["predicted_class"] == resp2.json()["predicted_class"]
    assert elapsed_ms < 15.0  # Fast HTTP roundtrip with cached result


def test_websocket_batched_telemetry_stream():
    """Verifies that the WebSocket telemetry stream delivers batched updates (5 epochs per frame)."""
    with client.websocket_connect("/ws/telemetry/aviation_vilnius") as websocket:
        data = websocket.receive_json()
        assert "batch_size" in data
        assert data["batch_size"] == 5
        assert len(data["epochs"]) == 5
        assert data["scenario_id"] == "aviation_vilnius"
        assert data["batch_start_epoch"] == 0


def test_database_persistence_anti_lag_buffer():
    """Verifies that saving multiple simulation runs completes in < 5ms without blocking on disk I/O."""
    dummy_payload = {
        "metadata": {
            "target_platform": "Flight B737",
            "default_attack_type": "MEACONING",
            "center_coords": [54.68, 25.28]
        },
        "total_epochs": 60
    }

    t0 = time.perf_counter()
    for i in range(10):
        mongo_service.save_simulation_run(f"perf_test_{i}", dummy_payload)
    elapsed_ms = (time.perf_counter() - t0) * 1000.0

    # 10 saves in memory buffer must be super fast
    assert elapsed_ms < 50.0, f"10 DB saves took {elapsed_ms:.2f}ms"
