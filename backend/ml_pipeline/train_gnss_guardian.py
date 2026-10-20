"""
AEGIS-GIS: GNSS Guardian Training & Threat Report Engine
Derived from 'GNSS Guardian — GPS Jamming & Spoofing Detection' Notebook.

Features:
1. 3-Way Threat Classification ('Normal', 'Jamming', 'Spoofing')
2. 3-Model Soft-Voting Ensemble:
   - RandomForestClassifier (120 Estimators, max_depth=12)
   - GradientBoostingClassifier / HistGradientBoosting (100 Estimators, lr=0.1)
   - MLPClassifier (128x64 Hidden Units, 250 Iterations)
3. Centroid Signature Calculation for Cosine Similarity Matching
4. Real-time ASCII / ANSI Terminal Logging & Cross-Validation
5. Automated GenAI Threat Report Synthesizer
6. Artifact Persistence in `backend/models/artifacts/`
"""

import os
import sys
import json
import time
from pathlib import Path

# Safe terminal encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
from typing import Dict, List, Any, Tuple, Optional
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    roc_auc_score,
)

# 11 Signal & RF Correlator Features (from GNSS Guardian Cell 30)
FEATURE_COLS = [
    "cn0_mean",
    "cn0_std",
    "cn0_min",
    "cn0_max",
    "agc_db",
    "num_satellites",
    "elevation_mean",
    "cn0_elev_corr",
    "position_jump",
    "bearing_confidence",
    "const_cn0_spread",
]

# Additional direction features
DIRECTION_COLS = [
    "est_source_azimuth",
    "est_source_elevation",
]

TARGET_LABEL_MAP = {
    "Normal": 0,
    "Jamming": 1,
    "Spoofing": 2,
}

TARGET_CLASSES = ["Normal", "Jamming", "Spoofing"]


def resolve_gnss_guardian_dataset() -> pd.DataFrame:
    """
    Locates the GNSS dataset inside the local repository Datasets folder.
    Falls back to statistical scenario synthesis if CSV is missing.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent
    candidate_paths = [
        repo_root / "Datasets" / "gnss-jamming-spoofing-detection" / "gnss_dataset.csv",
        repo_root / "Datasets" / "gnss_dataset.csv",
        Path("Datasets/gnss-jamming-spoofing-detection/gnss_dataset.csv"),
    ]

    for p in candidate_paths:
        if p.exists():
            print(f"[*] Found GNSS Guardian dataset: {p}")
            df = pd.read_csv(p)
            print(f"[*] Ingested {len(df):,} raw records with {len(df.columns)} columns.")
            return df

    # Fallback synthesizer if CSV missing
    print("[!] CSV not found. Generating 6,000 statistical GNSS Guardian epochs...")
    np.random.seed(42)
    n_per_class = 2000
    rows = []

    # Normal: high C/N0, low position jump, nominal AGC ~ -85 dB
    for _ in range(n_per_class):
        rows.append({
            "cn0_mean": np.random.normal(38.5, 3.0),
            "cn0_std": np.random.uniform(2.5, 5.0),
            "cn0_min": np.random.uniform(28.0, 32.0),
            "cn0_max": np.random.uniform(44.0, 48.0),
            "agc_db": np.random.normal(-85.0, 4.0),
            "num_satellites": np.random.randint(8, 14),
            "elevation_mean": np.random.uniform(35.0, 50.0),
            "cn0_elev_corr": np.random.uniform(0.85, 0.98),
            "position_jump": np.random.exponential(0.2),
            "bearing_confidence": np.random.uniform(0.8, 1.0),
            "const_cn0_spread": np.random.uniform(2.0, 6.0),
            "est_source_azimuth": np.random.uniform(0, 360),
            "est_source_elevation": np.random.uniform(10, 80),
            "attack_type": "Normal",
            "attacked_constellations": "none",
            "severity": "none",
        })

    # Jamming: severely degraded C/N0 (<28 dB), high AGC attenuation, missing satellites
    for _ in range(n_per_class):
        rows.append({
            "cn0_mean": np.random.normal(24.0, 4.0),
            "cn0_std": np.random.uniform(1.0, 3.0),
            "cn0_min": np.random.uniform(14.0, 20.0),
            "cn0_max": np.random.uniform(28.0, 34.0),
            "agc_db": np.random.normal(-52.0, 8.0),
            "num_satellites": np.random.randint(3, 7),
            "elevation_mean": np.random.uniform(20.0, 40.0),
            "cn0_elev_corr": np.random.uniform(0.1, 0.4),
            "position_jump": np.random.exponential(1.5),
            "bearing_confidence": np.random.uniform(0.1, 0.4),
            "const_cn0_spread": np.random.uniform(8.0, 16.0),
            "est_source_azimuth": np.random.uniform(0, 360),
            "est_source_elevation": np.random.uniform(5, 30),
            "attack_type": "Jamming",
            "attacked_constellations": "GPS, Galileo",
            "severity": "high",
        })

    # Spoofing: high artificial C/N0 (>45 dB), sharp position jumps (>10m), directional collapse
    for _ in range(n_per_class):
        rows.append({
            "cn0_mean": np.random.normal(46.0, 4.0),
            "cn0_std": np.random.uniform(6.0, 9.5),
            "cn0_min": np.random.uniform(32.0, 38.0),
            "cn0_max": np.random.uniform(50.0, 58.0),
            "agc_db": np.random.normal(-42.0, 6.0),
            "num_satellites": np.random.randint(9, 13),
            "elevation_mean": np.random.uniform(30.0, 45.0),
            "cn0_elev_corr": np.random.uniform(0.3, 0.6),
            "position_jump": np.random.uniform(8.0, 35.0),
            "bearing_confidence": np.random.uniform(0.85, 0.99),
            "const_cn0_spread": np.random.uniform(10.0, 18.0),
            "est_source_azimuth": np.random.normal(145.0, 15.0) % 360,
            "est_source_elevation": np.random.normal(25.0, 8.0),
            "attack_type": "Spoofing",
            "attacked_constellations": "GPS L1 C/A",
            "severity": "critical",
        })

    df = pd.DataFrame(rows)
    return df


class GNSSGuardianPipeline:
    """
    3-Way Threat Detection, Attack Centroid Matching, and Threat Reporting.
    """

    def __init__(self, artifacts_dir: Optional[Path] = None):
        if artifacts_dir is None:
            self.artifacts_dir = Path(__file__).resolve().parent.parent / "models" / "artifacts"
        else:
            self.artifacts_dir = Path(artifacts_dir)
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)

        self.model_path = self.artifacts_dir / "gnss_guardian_ensemble.joblib"
        self.scaler_path = self.artifacts_dir / "guardian_scaler.joblib"
        self.fingerprints_path = self.artifacts_dir / "attack_fingerprints.json"
        self.metrics_path = self.artifacts_dir / "guardian_evaluation_metrics.json"

        self.rf_model: Optional[RandomForestClassifier] = None
        self.gb_model: Optional[Any] = None
        self.mlp_model: Optional[MLPClassifier] = None
        self.scaler: Optional[StandardScaler] = None

        self.class_centroids: Dict[str, List[float]] = {}
        self.metrics: Dict[str, Any] = {}

    def train_and_evaluate(self) -> Dict[str, Any]:
        """Executes the full training, cross-validation, and signature computation."""
        print("\n" + "=" * 75)
        print("  [*] GNSS GUARDIAN: 3-WAY THREAT ENSEMBLE CLASSIFIER & CENTROID ENGINE")
        print("=" * 75)

        # 1. Dataset Resolution
        df = resolve_gnss_guardian_dataset()

        # Filter clean rows
        df_clean = df.dropna(subset=["attack_type"]).copy()
        df_clean = df_clean[df_clean["attack_type"].isin(TARGET_LABEL_MAP.keys())].reset_index(drop=True)

        X_raw = df_clean[FEATURE_COLS].copy()
        # Impute missing values with medians
        for c in FEATURE_COLS:
            if X_raw[c].isnull().any():
                X_raw[c] = X_raw[c].fillna(X_raw[c].median())

        y = df_clean["attack_type"].map(TARGET_LABEL_MAP).values.astype(np.int64)
        X = X_raw.values.astype(np.float32)

        print(f"\n[+] Feature Matrix Shape: {X.shape[0]:,} samples x {X.shape[1]} features")
        print(f"[+] Class Balance:")
        for c_name, c_idx in TARGET_LABEL_MAP.items():
            cnt = int(np.sum(y == c_idx))
            print(f"    - {c_name:<10} (Class {c_idx}): {cnt:>6,} samples ({cnt/len(y)*100:.1f}%)")

        # 2. Train / Test Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )
        print(f"\n[+] Partition: Train={X_train.shape[0]:,} | Test Holdout={X_test.shape[0]:,}")

        # 3. Standardization
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # 4. Model 1: Random Forest Classifier
        print("\n[+] Training Sub-Model 1: Random Forest Classifier (120 Trees, depth=12)...")
        self.rf_model = RandomForestClassifier(
            n_estimators=120,
            max_depth=12,
            random_state=42,
            n_jobs=-1,
        )
        t0 = time.time()
        self.rf_model.fit(X_train_scaled, y_train)
        rf_time = time.time() - t0
        print(f"    └── Completed in {rf_time:.2f}s | Train Acc: {self.rf_model.score(X_train_scaled, y_train)*100:.2f}%")

        # 5. Model 2: Gradient Boosting Classifier
        print("[+] Training Sub-Model 2: HistGradientBoosting (100 Iterations, lr=0.1)...")
        self.gb_model = HistGradientBoostingClassifier(
            max_iter=100,
            learning_rate=0.1,
            max_leaf_nodes=31,
            random_state=42,
        )
        t0 = time.time()
        self.gb_model.fit(X_train_scaled, y_train)
        gb_time = time.time() - t0
        print(f"    └── Completed in {gb_time:.2f}s | Train Acc: {self.gb_model.score(X_train_scaled, y_train)*100:.2f}%")

        # 6. Model 3: Deep MLP Classifier (128x64)
        print("[+] Training Sub-Model 3: Multi-Layer Perceptron (128x64 Units, Adam)...")
        self.mlp_model = MLPClassifier(
            hidden_layer_sizes=(128, 64),
            activation="relu",
            solver="adam",
            max_iter=250,
            random_state=42,
            early_stopping=True,
            n_iter_no_change=10,
        )
        t0 = time.time()
        self.mlp_model.fit(X_train_scaled, y_train)
        mlp_time = time.time() - t0
        print(f"    └── Completed in {mlp_time:.2f}s | Iterations: {self.mlp_model.n_iter_} | Final Loss: {self.mlp_model.loss_:.4f}")

        # 7. 5-Fold Cross Validation on Ensemble
        print("\n[+] Running 5-Fold Stratified Cross Validation on Random Forest Sub-Model...")
        cv_scores = cross_val_score(self.rf_model, X_train_scaled, y_train, cv=5, scoring="accuracy")
        print(f"    └── CV Fold Accuracies: {[round(float(s)*100, 2) for s in cv_scores]}")
        print(f"    └── Mean CV Accuracy:   {np.mean(cv_scores)*100:.2f}% (±{np.std(cv_scores)*100:.2f}%)")

        # 8. Soft-Voting Ensemble Prediction on Holdout Test Set
        print("\n[+] Computing Soft-Voting Ensemble Predictions on Holdout Test Set...")
        p_rf = self.rf_model.predict_proba(X_test_scaled)
        p_gb = self.gb_model.predict_proba(X_test_scaled)
        p_mlp = self.mlp_model.predict_proba(X_test_scaled)
        p_ensemble = (p_rf + p_gb + p_mlp) / 3.0
        y_pred = np.argmax(p_ensemble, axis=1)

        acc = float(accuracy_score(y_test, y_pred))
        macro_prec = float(precision_score(y_test, y_pred, average="macro"))
        macro_rec = float(recall_score(y_test, y_pred, average="macro"))
        macro_f1 = float(f1_score(y_test, y_pred, average="macro"))
        roc_auc = float(roc_auc_score(y_test, p_ensemble, multi_class="ovr"))

        cm = confusion_matrix(y_test, y_pred).tolist()

        # False alarm rate on Class 0 (Normal)
        auth_mask = (y_test == 0)
        false_alarms = int(np.sum(y_pred[auth_mask] != 0))
        total_auth = int(np.sum(auth_mask))
        far = float(false_alarms / total_auth) if total_auth > 0 else 0.0

        # Detailed per-class metrics
        rep = classification_report(y_test, y_pred, target_names=TARGET_CLASSES, output_dict=True)
        per_class = {}
        for c_name in TARGET_CLASSES:
            cd = rep.get(c_name, {})
            per_class[c_name] = {
                "precision": round(float(cd.get("precision", 0.0)), 4),
                "recall": round(float(cd.get("recall", 0.0)), 4),
                "f1_score": round(float(cd.get("f1-score", 0.0)), 4),
                "support": int(cd.get("support", 0)),
            }

        # Feature importances
        rf_imps = self.rf_model.feature_importances_
        feature_importance_ranking = [
            {"feature": f_name, "importance": round(float(imp), 4)}
            for f_name, imp in sorted(zip(FEATURE_COLS, rf_imps), key=lambda x: x[1], reverse=True)
        ]

        # 9. Compute Centroid Vector Signatures for Cosine Similarity Lookup
        print("\n[+] Computing Attack Centroid Vector Signatures for Telemetry Matching...")
        self.class_centroids = {}
        for c_name, c_idx in TARGET_LABEL_MAP.items():
            mask = (y_train == c_idx)
            centroid = np.mean(X_train_scaled[mask], axis=0)
            # Normalize vector to unit length
            norm_centroid = centroid / (np.linalg.norm(centroid) + 1e-9)
            self.class_centroids[c_name] = [round(float(v), 6) for v in norm_centroid]
            print(f"    └── Centroid [{c_name}]: {len(self.class_centroids[c_name])}D Unit Vector")

        # 10. Assemble Metrics & Artifacts
        self.metrics = {
            "model_title": "GNSS Guardian 3-Way Threat Soft-Voting Ensemble",
            "overall_accuracy": round(acc, 4),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "macro_f1_score": round(macro_f1, 4),
            "roc_auc_score": round(roc_auc, 4),
            "false_alarm_rate": round(far, 4),
            "total_samples": len(X),
            "test_samples": len(y_test),
            "target_classes": TARGET_CLASSES,
            "confusion_matrix": cm,
            "per_class_metrics": per_class,
            "feature_importance_ranking": feature_importance_ranking,
            "sub_model_scores": {
                "random_forest_acc": round(float(accuracy_score(y_test, np.argmax(p_rf, axis=1))), 4),
                "gradient_boosting_acc": round(float(accuracy_score(y_test, np.argmax(p_gb, axis=1))), 4),
                "mlp_neural_network_acc": round(float(accuracy_score(y_test, np.argmax(p_mlp, axis=1))), 4),
                "ensemble_soft_voting_acc": round(acc, 4),
            },
        }

        # 11. Terminal ASCII Report
        self._print_terminal_report()

        # 12. Save Artifacts
        package = {
            "rf": self.rf_model,
            "gb": self.gb_model,
            "mlp": self.mlp_model,
            "scaler": self.scaler,
            "features": FEATURE_COLS,
            "classes": TARGET_CLASSES,
            "centroids": self.class_centroids,
            "metrics": self.metrics,
        }
        joblib.dump(package, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)

        # Save attack fingerprints JSON
        fingerprints_payload = {
            "centroids": self.class_centroids,
            "feature_columns": FEATURE_COLS,
            "description": "Normalized centroid vectors representing characteristic RF threat signatures for cosine similarity retrieval.",
            "top_discriminative_features": feature_importance_ranking[:4],
        }
        self.fingerprints_path.write_text(json.dumps(fingerprints_payload, indent=2), encoding="utf-8")

        # Save evaluation metrics
        self.metrics_path.write_text(json.dumps(self.metrics, indent=2), encoding="utf-8")

        print(f"\n[+] Artifacts Saved Successfully:")
        print(f"    - Model Ensemble:    {self.model_path}")
        print(f"    - Feature Scaler:    {self.scaler_path}")
        print(f"    - Fingerprints JSON: {self.fingerprints_path}")
        print(f"    - Metrics JSON:      {self.metrics_path}")

        return self.metrics

    def _print_terminal_report(self):
        """Prints a professional, clean ASCII terminal report."""
        print("\n" + "=" * 75)
        print("  [REPORT] GNSS GUARDIAN MODEL EVALUATION REPORT & PRECISION/RECALL MATRIX")
        print("=" * 75)
        print(f"  Overall Accuracy:        {self.metrics['overall_accuracy'] * 100:.2f}%")
        print(f"  Macro Precision:         {self.metrics['macro_precision'] * 100:.2f}%")
        print(f"  Macro Recall:            {self.metrics['macro_recall'] * 100:.2f}%")
        print(f"  Macro F1-Score:          {self.metrics['macro_f1_score'] * 100:.2f}%")
        print(f"  ROC-AUC (OVR):           {self.metrics['roc_auc_score']:.4f}")
        print(f"  False Alarm Rate (FAR):  {self.metrics['false_alarm_rate'] * 100:.2f}%\n")

        print(f"  {'Class Name':<12} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
        print("  " + "-" * 62)
        for c_name, c_data in self.metrics["per_class_metrics"].items():
            print(
                f"  {c_name:<12} | {c_data['precision'] * 100:>8.2f}% | "
                f"{c_data['recall'] * 100:>8.2f}% | {c_data['f1_score'] * 100:>8.2f}% | "
                f"{c_data['support']:>8,}"
            )
        print("  " + "-" * 62)

        print("\n  Confusion Matrix (Rows: Ground Truth, Columns: Predicted):")
        header = " " * 14 + " ".join([f"{c[:8]:>9}" for c in TARGET_CLASSES])
        print("  " + header)
        for idx, row in enumerate(self.metrics["confusion_matrix"]):
            row_str = " ".join([f"{val:>9,}" for val in row])
            print(f"  {TARGET_CLASSES[idx]:<12} : {row_str}")

        print("\n  Top Discriminative Signal Features (Gini Importance):")
        for rank, f_info in enumerate(self.metrics["feature_importance_ranking"][:5], 1):
            print(f"    {rank}. {f_info['feature']:<22} : {f_info['importance'] * 100:.2f}%")
        print("=" * 75)


def generate_guardian_threat_report(
    predicted_class: str,
    confidence_pct: float,
    telemetry_dict: Dict[str, Any],
    top_matches: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    Synthesizes the GenAI Threat Report (mirroring Cell 61/63 of the GNSS Guardian notebook).
    """
    cn0 = float(telemetry_dict.get("cn0_mean", 38.0))
    agc = float(telemetry_dict.get("agc_db", -85.0))
    pos_jump = float(telemetry_dict.get("position_jump", 0.0))
    azimuth = float(telemetry_dict.get("est_source_azimuth", 180.0))
    bearing_conf = float(telemetry_dict.get("bearing_confidence", 0.85))

    direction_str = f"{azimuth:.0f}° azimuth (bearing confidence {bearing_conf:.2f})"

    if predicted_class == "Normal":
        severity = "NOMINAL (Green)"
        cause = "Multi-constellation line-of-sight tracking within nominal limits."
        action = "Maintain continuous multi-frequency monitoring. No mitigation required."
    elif predicted_class == "Jamming":
        severity = "HIGH (Amber)"
        cause = f"High-power wideband interference detected. AGC attenuation clamped at {agc:.1f} dBm; carrier-to-noise collapsed to {cn0:.1f} dB-Hz."
        action = "Activate spatial beamforming null-steering towards {direction_str} and fallback to inertial INS dead-reckoning."
    else: # Spoofing
        severity = "CRITICAL (Red)"
        cause = f"Stealthy pseudorange & carrier injection detected. Sudden coordinate pull-off of {pos_jump:.1f} meters with directional spatial collapse from {direction_str}."
        action = "Isolate corrupted GPS L1 C/A channels immediately; lock autopilot to Galileo OS-NMA verified ephemeris and EKF inertial dead-reckoning."

    matches_text = ""
    if top_matches:
        matches_text = "\n\nSimilar Historical Threat Signatures:\n" + "\n".join(
            [f"- {m.get('title', 'Scenario')} (Similarity: {m.get('similarity', 0.0):.2f}): {m.get('narrative', '')[:90]}..."
             for m in top_matches[:3]]
        )

    report = (
        f"GNSS GUARDIAN INCIDENT FORENSIC REPORT\n"
        f"----------------------------------------\n"
        f"Detection Classification: {predicted_class.upper()} (Confidence: {confidence_pct:.1f}%)\n"
        f"Incident Severity:        {severity}\n"
        f"Estimated Threat Vector:  {direction_str}\n"
        f"Primary Indicator:        C/N0={cn0:.1f} dB-Hz | AGC={agc:.1f} dBm | Position Jump={pos_jump:.2f} m\n\n"
        f"Threat Assessment:\n{cause}\n\n"
        f"Recommended Countermeasure:\n{action}"
        f"{matches_text}"
    )
    return report


if __name__ == "__main__":
    pipeline = GNSSGuardianPipeline()
    pipeline.train_and_evaluate()
