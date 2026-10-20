"""
AEGIS-GIS: Phase 8 Automated Verification Test Suite
Tests for GNSS Guardian Integration:
1. Dataset ingestion & synthesis
2. 3-Way Threat Classification (Normal, Jamming, Spoofing)
3. Model Artifacts & Centroid Cosine Similarity Matching
4. GenAI Threat Report Generation
5. FastAPI Server Integration (/api/guardian/diagnostics, /api/guardian/predict-report)
"""

from pathlib import Path
import pytest
import numpy as np
import joblib
from fastapi.testclient import TestClient

from backend.ml_pipeline.train_gnss_guardian import (
    FEATURE_COLS,
    TARGET_CLASSES,
    resolve_gnss_guardian_dataset,
    generate_guardian_threat_report,
)
from backend.main import app

client = TestClient(app)


def test_guardian_dataset_resolution():
    """Verify GNSS Guardian dataset resolves and has the 11 feature columns."""
    df = resolve_gnss_guardian_dataset()
    assert df is not None
    assert len(df) >= 5000
    for col in FEATURE_COLS:
        assert col in df.columns, f"Missing feature column: {col}"
    assert "attack_type" in df.columns


def test_guardian_artifacts_integrity():
    """Verify that all required Guardian model artifacts exist and load cleanly."""
    artifacts_dir = Path(__file__).resolve().parent.parent / "backend" / "models" / "artifacts"
    model_path = artifacts_dir / "gnss_guardian_ensemble.joblib"
    scaler_path = artifacts_dir / "guardian_scaler.joblib"
    fingerprints_path = artifacts_dir / "attack_fingerprints.json"
    metrics_path = artifacts_dir / "guardian_evaluation_metrics.json"

    assert model_path.exists(), f"Missing {model_path}"
    assert scaler_path.exists(), f"Missing {scaler_path}"
    assert fingerprints_path.exists(), f"Missing {fingerprints_path}"
    assert metrics_path.exists(), f"Missing {metrics_path}"

    pkg = joblib.load(model_path)
    assert "rf" in pkg
    assert "gb" in pkg
    assert "mlp" in pkg
    assert "scaler" in pkg
    assert "centroids" in pkg
    assert len(pkg["centroids"]) == 3
    assert set(pkg["centroids"].keys()) == {"Normal", "Jamming", "Spoofing"}


def test_guardian_ensemble_inference_accuracy():
    """Verify soft-voting ensemble prediction across RF + GB + MLP."""
    artifacts_dir = Path(__file__).resolve().parent.parent / "backend" / "models" / "artifacts"
    pkg = joblib.load(artifacts_dir / "gnss_guardian_ensemble.joblib")

    rf = pkg["rf"]
    gb = pkg["gb"]
    mlp = pkg["mlp"]
    scaler = pkg["scaler"]
    classes = pkg["classes"]

    # Authentic sample (healthy C/N0, small position jump, normal AGC)
    normal_sample = np.array([39.0, 3.5, 30.0, 46.0, -84.0, 10, 42.0, 0.92, 0.1, 0.95, 4.0]).reshape(1, -1)
    scaled_norm = scaler.transform(normal_sample)

    p1 = rf.predict_proba(scaled_norm)[0]
    p2 = gb.predict_proba(scaled_norm)[0]
    p3 = mlp.predict_proba(scaled_norm)[0]
    p_ens = (p1 + p2 + p3) / 3.0

    assert np.isclose(np.sum(p_ens), 1.0, atol=1e-4)
    assert classes[int(np.argmax(p_ens))] == "Normal"

    # Jamming sample (collapsed C/N0, high AGC attenuation, missing sats)
    jamming_sample = np.array([22.0, 1.8, 14.0, 26.0, -48.0, 4, 25.0, 0.20, 1.8, 0.25, 12.0]).reshape(1, -1)
    scaled_jam = scaler.transform(jamming_sample)
    p_jam = (rf.predict_proba(scaled_jam)[0] + gb.predict_proba(scaled_jam)[0] + mlp.predict_proba(scaled_jam)[0]) / 3.0
    assert classes[int(np.argmax(p_jam))] == "Jamming"

    # Spoofing sample (agc around -76 dB, position jump 12+ m, cn0 ~36.5 dB)
    spoofing_sample = np.array([36.5, 5.2, 28.5, 45.0, -76.0, 10, 45.0, 0.78, 12.5, 0.82, 7.8]).reshape(1, -1)
    scaled_spf = scaler.transform(spoofing_sample)
    p_spf = (rf.predict_proba(scaled_spf)[0] + gb.predict_proba(scaled_spf)[0] + mlp.predict_proba(scaled_spf)[0]) / 3.0
    assert classes[int(np.argmax(p_spf))] == "Spoofing"


def test_centroid_cosine_similarity():
    """Verify centroid cosine similarity yields highest score for the true class."""
    artifacts_dir = Path(__file__).resolve().parent.parent / "backend" / "models" / "artifacts"
    pkg = joblib.load(artifacts_dir / "gnss_guardian_ensemble.joblib")
    scaler = pkg["scaler"]
    centroids = pkg["centroids"]

    # Spoofed sample
    spoof_raw = np.array([36.5, 5.2, 28.5, 45.0, -76.0, 10, 45.0, 0.78, 12.5, 0.82, 7.8]).reshape(1, -1)
    scaled = scaler.transform(spoof_raw)[0]
    norm_vec = scaled / (np.linalg.norm(scaled) + 1e-9)

    sims = {}
    for c_name, c_vec in centroids.items():
        c_arr = np.array(c_vec, dtype=np.float32)
        sim = float(np.dot(norm_vec, c_arr) / (np.linalg.norm(c_arr) + 1e-9))
        sims[c_name] = sim

    # Spoofing similarity must be the highest among all centroids
    assert sims["Spoofing"] > sims["Normal"]
    assert sims["Spoofing"] > sims["Jamming"]


def test_threat_report_synthesis():
    """Verify GenAI Threat Report synthesis outputs valid structured incident reports."""
    telemetry = {
        "cn0_mean": 36.5,
        "agc_db": -76.0,
        "position_jump": 14.8,
        "est_source_azimuth": 142.0,
        "bearing_confidence": 0.92,
    }
    report = generate_guardian_threat_report(
        predicted_class="Spoofing",
        confidence_pct=99.4,
        telemetry_dict=telemetry
    )

    assert "GNSS GUARDIAN INCIDENT FORENSIC REPORT" in report
    assert "SPOOFING" in report
    assert "99.4%" in report
    assert "142°" in report
    assert "CRITICAL" in report


def test_api_guardian_endpoints():
    """Verify /api/guardian/diagnostics and /api/guardian/predict-report HTTP endpoints."""
    # Diagnostics endpoint
    res_diag = client.get("/api/guardian/diagnostics")
    assert res_diag.status_code == 200
    diag_data = res_diag.json()
    assert "overall_accuracy" in diag_data
    assert diag_data["overall_accuracy"] >= 0.95

    # Predict & Report endpoint
    payload = {
        "cn0_mean": 36.5,
        "cn0_std": 5.2,
        "cn0_min": 28.5,
        "cn0_max": 45.0,
        "agc_db": -76.0,
        "num_satellites": 10,
        "elevation_mean": 45.0,
        "cn0_elev_corr": 0.78,
        "position_jump": 12.5,
        "bearing_confidence": 0.85,
        "const_cn0_spread": 7.8,
        "est_source_azimuth": 150.0,
        "est_source_elevation": 28.0,
    }
    res_pred = client.post("/api/guardian/predict-report", json=payload)
    assert res_pred.status_code == 200
    data = res_pred.json()

    assert data["predicted_class"] == "Spoofing"
    assert data["confidence_pct"] >= 90.0
    assert "centroid_cosine_similarities" in data
    assert "genai_threat_report" in data
    assert "GNSS GUARDIAN" in data["genai_threat_report"]
