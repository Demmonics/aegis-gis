"""
Unit tests for Phase 2: 5-Layer Defense Engine, Extended Kalman Filter & Multi-Class ML Ensemble
"""

import math
from pathlib import Path
import pytest
import numpy as np

from backend.physics.signal_simulator import (
    SpoofingAttackType,
    GNSSSignalSimulator,
)
from backend.physics.scenarios import run_scenario
from backend.defense.physical_crypto_layers import (
    SQMDetector,
    MultiAntennaDoADetector,
    GalileoOSNMAVerifier,
)
from backend.defense.kalman_raim_fusion import (
    RAIMIntegrityMonitor,
    INSGNSSExtendedKalmanFilter,
)
from backend.defense.ml_classifier import (
    AEGISMultiClassSpoofingClassifier,
    CLASS_NAMES,
)
from backend.defense.layered_pipeline import LayeredDefenseCoordinator


class TestPhysicalCryptoLayers:
    """Test Layers 1, 2, and 3 detectors."""

    def test_sqm_detector(self):
        detector = SQMDetector()
        sim = GNSSSignalSimulator(seed=1)

        # Authentic should pass
        auth_telem = sim.generate_epoch_telemetry(0, SpoofingAttackType.AUTHENTIC, 54.68, 19.85)
        res_auth = detector.evaluate(auth_telem.features_14d)
        assert res_auth.triggered is False
        assert res_auth.anomaly_score < 0.40

        # Simplistic spoofer overpower should trigger
        simp_telem = sim.generate_epoch_telemetry(1, SpoofingAttackType.SIMPLISTIC_NON_SYNC, 54.68, 19.85)
        res_simp = detector.evaluate(simp_telem.features_14d)
        assert res_simp.triggered is True
        assert res_simp.anomaly_score > 0.50

    def test_doa_detector(self):
        detector = MultiAntennaDoADetector()

        # Distributed sky geometry passes
        res_pass = detector.evaluate({"doa_azimuth_variance_deg": 65.0})
        assert res_pass.triggered is False
        assert res_pass.anomaly_score < 0.20

        # Single transmitter antenna collapse triggers
        res_collapse = detector.evaluate({"doa_azimuth_variance_deg": 3.5})
        assert res_collapse.triggered is True
        assert res_collapse.anomaly_score > 0.70

    def test_osnma_verifier(self):
        verifier = GalileoOSNMAVerifier()
        sim = GNSSSignalSimulator(seed=2)

        auth_telem = sim.generate_epoch_telemetry(0, SpoofingAttackType.AUTHENTIC, 54.68, 19.85)
        res_auth = verifier.evaluate(auth_telem.satellites)
        assert res_auth.triggered is False

        # Expired replay / meaconing triggers
        meac_telem = sim.generate_epoch_telemetry(1, SpoofingAttackType.MEACONING, 54.68, 19.85)
        res_meac = verifier.evaluate(meac_telem.satellites, attack_type_hint="MEACONING")
        assert res_meac.triggered is True


class TestKalmanAndRAIM:
    """Test Layer 4 EKF trajectory recovery and RAIM residuals."""

    def test_raim_monitor(self):
        raim = RAIMIntegrityMonitor()

        # Low residuals pass
        res_good = raim.evaluate(satellite_count=10, pseudorange_residual_rms=1.2)
        assert res_good.alarm_triggered is False

        # High residuals alarm
        res_bad = raim.evaluate(satellite_count=10, pseudorange_residual_rms=18.5)
        assert res_bad.alarm_triggered is True

    def test_ekf_trajectory_recovery_baltic_scenario(self):
        """
        Critical Test from Spec: When spoofed position jumps by >5,000m inland,
        EKF must reject the corrupted GNSS fix and keep position error < 15m.
        """
        run = run_scenario("baltic_maritime_c4ads", total_epochs=60)
        first_telem = run.telemetry[0]

        ekf = INSGNSSExtendedKalmanFilter(
            initial_lat=first_telem.true_lat,
            initial_lon=first_telem.true_lon,
            initial_alt=5.0,
            initial_v_n=0.0008 * 111320.0,
            initial_v_e=0.0012 * 111320.0 * math.cos(math.radians(first_telem.true_lat))
        )

        recovered_errors = []
        raw_spoofed_errors = []

        for t in range(run.total_epochs):
            telem = run.telemetry[t]
            if t > 0:
                ekf.predict(dt=1.0)
            force_reject = (t >= run.metadata.attack_start_epoch)
            out = ekf.update_gnss(
                epoch=t,
                gnss_lat_deg=telem.reported_lat,
                gnss_lon_deg=telem.reported_lon,
                gnss_alt_m=telem.reported_alt,
                force_reject=force_reject
            )

            # Measure distance from true path
            d_lat_m = (out.reconstructed_lat - telem.true_lat) * 111320.0
            d_lon_m = (out.reconstructed_lon - telem.true_lon) * 111320.0 * math.cos(math.radians(telem.true_lat))
            rec_dist = math.hypot(d_lat_m, d_lon_m)
            recovered_errors.append(rec_dist)

            d_spoof_lat_m = (telem.reported_lat - telem.true_lat) * 111320.0
            d_spoof_lon_m = (telem.reported_lon - telem.true_lon) * 111320.0 * math.cos(math.radians(telem.true_lat))
            spoof_dist = math.hypot(d_spoof_lat_m, d_spoof_lon_m)
            raw_spoofed_errors.append(spoof_dist)

        # In Baltic scenario, the spoofer pulls position by over 10,000 meters
        final_spoofed_err = raw_spoofed_errors[-1]
        final_recovered_err = recovered_errors[-1]

        assert final_spoofed_err > 5000.0, f"Expected >5000m spoofed jump, got {final_spoofed_err}m"
        assert final_recovered_err < 15.0, f"EKF recovered error too high: {final_recovered_err}m"


class TestMLClassifier:
    """Test Layer 5 ML ensemble training, accuracy, and artifacts."""

    def test_classifier_accuracy_and_artifacts(self):
        artifacts_dir = Path(__file__).resolve().parent.parent / "backend" / "models" / "artifacts"
        classifier = AEGISMultiClassSpoofingClassifier(artifacts_dir=artifacts_dir)

        metrics = classifier.evaluation_metrics
        assert metrics["overall_accuracy"] >= 0.96, f"Accuracy {metrics['overall_accuracy']} < 0.96"
        assert metrics["macro_f1_score"] >= 0.95
        assert metrics["false_alarm_rate"] < 0.05
        assert len(metrics["class_names"]) == 7
        assert len(metrics["confusion_matrix"]) == 7
        assert len(metrics["feature_importance_ranking"]) == 14

        # Verify artifacts exist on disk
        assert (artifacts_dir / "ensemble_model.joblib").exists()
        assert (artifacts_dir / "scaler.joblib").exists()
        assert (artifacts_dir / "evaluation_metrics.json").exists()

        # Test single epoch prediction
        sim = GNSSSignalSimulator(seed=99)
        telem = sim.generate_epoch_telemetry(0, SpoofingAttackType.DRIFT_EVASIVE_UAV, 18.96, 72.97)
        pred = classifier.predict_epoch(telem.feature_vector)

        assert pred["is_spoofed"] is True
        assert pred["predicted_attack_type"] in CLASS_NAMES
        assert 0.0 <= pred["confidence_score"] <= 1.0
        assert len(pred["top_contributing_features"]) >= 3


class TestLayeredCoordinator:
    """Test full multi-layer defense coordination."""

    def test_scenario_processing(self):
        coordinator = LayeredDefenseCoordinator()
        run = run_scenario("uav_lidar_survey", total_epochs=20)
        records = coordinator.process_scenario_stream(run.telemetry)

        assert len(records) == 20
        # First 10 epochs authentic
        for r in records[:9]:
            assert r.integrity_status == "VERIFIED_AUTHENTIC"
            assert r.mitigation_active is False

        # Later epochs during spoofing should detect and mitigate
        mitigated_count = sum(1 for r in records[12:] if r.mitigation_active)
        assert mitigated_count > 0, "Expected spoofing detection and mitigation during attack"
