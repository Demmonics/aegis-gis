"""
AEGIS-GIS: Phase 7 Automated Verification Test Suite
Verifies:
1. Hugging Face Dataset Ingestion & Feature Alignment (`hf_loader.py`)
2. Model Training & Artifact Persistence (`gnss_spoof_detector.pkl`)
3. Precision, Recall & Evaluation Metrics Integrity
4. FastAPI Server Integration (`/api/ml/hf-benchmark`, `/api/ml/predict-hf`)
"""

import os
from pathlib import Path
import pytest
import numpy as np
import joblib
from fastapi.testclient import TestClient

from backend.ml_pipeline.hf_loader import (
    load_hf_gnss_dataset,
    parse_and_align_features,
    TARGET_COLUMNS,
)
from backend.main import app

client = TestClient(app)


def test_hf_dataset_loader():
    """Verify that dataset loader pulls the 14,850 sample dataset."""
    df = load_hf_gnss_dataset()
    assert df is not None
    assert len(df) >= 10000
    assert "attack_type" in df.columns or "label" in df.columns
    assert "cn0_mean" in df.columns
    assert "position_jump" in df.columns


def test_feature_parsing_and_alignment():
    """Verify that parsed features are non-empty and have zero NaNs."""
    df = load_hf_gnss_dataset()
    X, y, features, classes = parse_and_align_features(df)

    assert X.shape[0] == len(y)
    assert X.shape[1] == len(features)
    assert not np.isnan(X).any(), "Feature matrix contains NaNs!"
    assert len(classes) == 3
    assert set(classes) == {"AUTHENTIC", "SPOOFING", "JAMMING"}
    assert set(np.unique(y)) == {0, 1, 2}


def test_trained_model_artifact_exists():
    """Verify that gnss_spoof_detector.pkl exists and has required components."""
    model_path = Path(__file__).resolve().parent.parent / "backend" / "models" / "gnss_spoof_detector.pkl"
    assert model_path.exists(), f"Model file not found at {model_path}"

    pkg = joblib.load(model_path)
    assert "rf" in pkg
    assert "gb" in pkg
    assert "scaler" in pkg
    assert "features" in pkg
    assert "classes" in pkg
    assert "metrics" in pkg

    metrics = pkg["metrics"]
    assert metrics["overall_accuracy"] >= 0.95
    assert metrics["macro_precision"] >= 0.95
    assert metrics["macro_recall"] >= 0.95
    assert metrics["false_alarm_rate"] <= 0.05


def test_model_inference_probability_distribution():
    """Verify model inference on synthetic telemetry vector."""
    model_path = Path(__file__).resolve().parent.parent / "backend" / "models" / "gnss_spoof_detector.pkl"
    pkg = joblib.load(model_path)

    rf = pkg["rf"]
    gb = pkg["gb"]
    scaler = pkg["scaler"]
    features = pkg["features"]
    classes = pkg["classes"]

    # Nominal authentic sample (low position jump, normal AGC, healthy C/N0)
    nominal_vec = np.array([
        38.5,   # cn0_mean
        4.2,    # cn0_std
        31.0,   # cn0_min
        45.0,   # cn0_max
        -85.0,  # agc_db
        10.0,   # num_satellites
        45.0,   # elevation_mean
        0.92,   # cn0_elev_corr
        0.15,   # position_jump (sub-meter)
        0.95,   # bearing_confidence
        4.5,    # const_cn0_spread
        180.0,  # est_source_azimuth
        60.0    # est_source_elevation
    ], dtype=np.float32).reshape(1, -1)

    nominal_scaled = scaler.transform(nominal_vec)
    p_rf = rf.predict_proba(nominal_scaled)[0]
    p_gb = gb.predict_proba(nominal_scaled)[0]
    p_ens = (p_rf + p_gb) / 2.0

    assert np.isclose(np.sum(p_ens), 1.0, atol=1e-4)
    # Authentic probability should dominate
    assert p_ens[0] > 0.70

    # High-intensity spoofing sample (huge position jump, high AGC, distorted C/N0)
    spoofed_vec = np.array([
        52.0,   # cn0_mean (overpowered)
        8.5,    # cn0_std
        35.0,   # cn0_min
        58.0,   # cn0_max
        -40.0,  # agc_db (severe attenuation due to overpower)
        8.0,    # num_satellites
        30.0,   # elevation_mean
        0.45,   # cn0_elev_corr
        14.8,   # position_jump (14.8 meters sudden step)
        0.15,   # bearing_confidence (collapsed)
        12.0,   # const_cn0_spread
        45.0,   # est_source_azimuth
        12.0    # est_source_elevation
    ], dtype=np.float32).reshape(1, -1)

    spoofed_scaled = scaler.transform(spoofed_vec)
    p_rf_sp = rf.predict_proba(spoofed_scaled)[0]
    p_gb_sp = gb.predict_proba(spoofed_scaled)[0]
    p_ens_sp = (p_rf_sp + p_gb_sp) / 2.0

    assert np.isclose(np.sum(p_ens_sp), 1.0, atol=1e-4)
    # Spoofed or jammed probability should dominate
    assert (p_ens_sp[1] + p_ens_sp[2]) > 0.70


def test_api_health_includes_hf_classifier():
    """Verify /api/health returns Hugging Face classifier status."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert "hf_realworld_classifier" in data["services"]
    hf_info = data["services"]["hf_realworld_classifier"]
    assert hf_info["status"] == "ONLINE"
    assert hf_info["accuracy"] >= 0.95


def test_api_hf_benchmark_endpoint():
    """Verify /api/ml/hf-benchmark returns full precision/recall metrics."""
    res = client.get("/api/ml/hf-benchmark")
    assert res.status_code == 200
    metrics = res.json()
    assert metrics["overall_accuracy"] >= 0.95
    assert "per_class_metrics" in metrics or "macro_precision" in metrics
    assert "classes" in metrics


def test_api_predict_hf_endpoint():
    """Verify /api/ml/predict-hf performs live inference via HTTP POST."""
    payload = {
        "cn0_mean": 38.0,
        "cn0_std": 4.5,
        "cn0_min": 30.0,
        "cn0_max": 46.0,
        "agc_db": -84.0,
        "num_satellites": 9,
        "elevation_mean": 42.0,
        "cn0_elev_corr": 0.90,
        "position_jump": 0.20,
        "bearing_confidence": 0.95,
        "const_cn0_spread": 5.0,
        "est_source_azimuth": 180.0,
        "est_source_elevation": 55.0
    }
    res = client.post("/api/ml/predict-hf", json=payload)
    assert res.status_code == 200
    pred = res.json()
    assert "predicted_class" in pred
    assert "confidence" in pred
    assert "class_probabilities" in pred
    assert pred["predicted_class"] == "AUTHENTIC"
