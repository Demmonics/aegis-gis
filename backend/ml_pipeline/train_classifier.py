"""
AEGIS-GIS: Phase 7 — Real-World Hugging Face Model Training Pipeline
Implements Section 6.5 Ensemble Classifier Training:
- Ingests 14,850 real-world GNSS telemetry vectors via `hf_loader.py`
- Trains Random Forest + HistGradientBoosting soft-voting ensemble
- Computes Precision, Recall, Macro F1, False Alarm Rate, and Confusion Matrix
- Exports calibrated model to `backend/models/gnss_spoof_detector.pkl`
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

# Relative or absolute imports
try:
    from .hf_loader import load_hf_gnss_dataset, parse_and_align_features
except ImportError:
    from hf_loader import load_hf_gnss_dataset, parse_and_align_features


class HFGnssEnsembleClassifier:
    """
    Random Forest + HistGradientBoosting Ensemble Classifier trained on Hugging Face
    real-world GNSS interference telemetry.
    """

    def __init__(self, models_dir: Optional[Path] = None):
        if models_dir is None:
            self.models_dir = Path(__file__).resolve().parent.parent / "models"
        else:
            self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)
        (self.models_dir / "artifacts").mkdir(parents=True, exist_ok=True)

        self.model_pkl_path = self.models_dir / "gnss_spoof_detector.pkl"
        self.artifacts_model_path = self.models_dir / "artifacts" / "hf_ensemble_model.joblib"
        self.metrics_path = self.models_dir / "artifacts" / "hf_evaluation_metrics.json"

        self.rf_model: Optional[RandomForestClassifier] = None
        self.gb_model: Optional[HistGradientBoostingClassifier] = None
        self.scaler: Optional[StandardScaler] = None
        self.features: list = []
        self.classes: list = []
        self.metrics: Dict[str, Any] = {}

    def train(self, test_size: float = 0.20, random_state: int = 42) -> Dict[str, Any]:
        """
        Loads Hugging Face dataset, trains Random Forest + HistGradientBoosting,
        computes evaluation metrics, and saves the artifacts.
        """
        print("\n" + "=" * 70)
        print("  AEGIS-GIS: HUGGING FACE GNSS ENSEMBLE CLASSIFIER TRAINING (PHASE 7)")
        print("=" * 70)

        # 1. Ingest Dataset
        df = load_hf_gnss_dataset()
        X, y, features, classes = parse_and_align_features(df)
        self.features = features
        self.classes = classes

        # 2. Train / Test Split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state, stratify=y
        )
        print(f"\n[TRAIN] Training set: {X_train.shape[0]:,} samples | Test set: {X_test.shape[0]:,} samples")

        # 3. Standardize Features
        self.scaler = StandardScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # 4. Train Sub-Model 1: Random Forest
        print("[TRAIN] Training Sub-Model 1: Random Forest Classifier (100 Trees)...")
        self.rf_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=14,
            min_samples_split=4,
            random_state=random_state,
            n_jobs=-1,
        )
        self.rf_model.fit(X_train_scaled, y_train)

        # 5. Train Sub-Model 2: HistGradientBoosting
        print("[TRAIN] Training Sub-Model 2: HistGradientBoosting Classifier (100 Iterations)...")
        self.gb_model = HistGradientBoostingClassifier(
            max_iter=100,
            learning_rate=0.1,
            max_leaf_nodes=31,
            random_state=random_state,
        )
        self.gb_model.fit(X_train_scaled, y_train)

        # 6. Ensemble Soft-Voting Prediction on Test Set
        print("[EVAL] Computing Soft-Voting Probabilities on Test Holdout...")
        p_rf = self.rf_model.predict_proba(X_test_scaled)
        p_gb = self.gb_model.predict_proba(X_test_scaled)
        p_ensemble = (p_rf + p_gb) / 2.0
        y_pred = np.argmax(p_ensemble, axis=1)

        # 7. Comprehensive Metrics Calculation
        acc = float(accuracy_score(y_test, y_pred))
        macro_prec = float(precision_score(y_test, y_pred, average="macro"))
        macro_rec = float(recall_score(y_test, y_pred, average="macro"))
        macro_f1 = float(f1_score(y_test, y_pred, average="macro"))

        cm = confusion_matrix(y_test, y_pred).tolist()

        # False Alarm Rate on Authentic Signals (Class 0)
        auth_mask = (y_test == 0)
        false_alarms = int(np.sum(y_pred[auth_mask] != 0))
        total_auth = int(np.sum(auth_mask))
        far = float(false_alarms / total_auth) if total_auth > 0 else 0.0

        # Feature Importance from Random Forest
        rf_importances = self.rf_model.feature_importances_
        feature_ranking = [
            {"feature": f_name, "importance": round(float(imp), 4)}
            for f_name, imp in sorted(zip(self.features, rf_importances), key=lambda x: x[1], reverse=True)
        ]

        # Classification Report Breakdown
        rep_dict = classification_report(y_test, y_pred, target_names=self.classes, output_dict=True)
        per_class = {}
        for c_name in self.classes:
            cd = rep_dict.get(c_name, {})
            per_class[c_name] = {
                "precision": round(float(cd.get("precision", 0.0)), 4),
                "recall": round(float(cd.get("recall", 0.0)), 4),
                "f1_score": round(float(cd.get("f1-score", 0.0)), 4),
                "support": int(cd.get("support", 0)),
            }

        self.metrics = {
            "source_dataset": "Omrilevi123/gnss-jamming-spoofing-detection (Hugging Face)",
            "total_samples": len(X),
            "test_samples": len(y_test),
            "overall_accuracy": round(acc, 4),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "macro_f1_score": round(macro_f1, 4),
            "false_alarm_rate": round(far, 4),
            "classes": self.classes,
            "confusion_matrix": cm,
            "per_class_metrics": per_class,
            "feature_importance_ranking": feature_ranking,
        }

        # 8. Print Formatted Terminal Precision/Recall Matrix
        self._print_evaluation_summary(y_test, y_pred)

        # 9. Save Artifacts into backend/models/
        package = {
            "rf": self.rf_model,
            "gb": self.gb_model,
            "scaler": self.scaler,
            "features": self.features,
            "classes": self.classes,
            "metrics": self.metrics,
        }
        joblib.dump(package, self.model_pkl_path)
        joblib.dump(package, self.artifacts_model_path)
        self.metrics_path.write_text(json.dumps(self.metrics, indent=2), encoding="utf-8")

        print(f"\n[ARTIFACT] Model successfully saved to: {self.model_pkl_path}")
        print(f"[ARTIFACT] Backup artifact saved to:     {self.artifacts_model_path}")
        print(f"[ARTIFACT] Metrics JSON saved to:        {self.metrics_path}")

        return self.metrics

    def _print_evaluation_summary(self, y_true: np.ndarray, y_pred: np.ndarray):
        """Prints a clean, formatted terminal summary for professors & evaluators."""
        print("\n" + "-" * 70)
        print("  HUGGING FACE MODEL EVALUATION REPORT & PRECISION / RECALL MATRIX")
        print("-" * 70)
        print(f"Overall Accuracy:        {self.metrics['overall_accuracy'] * 100:.2f}%")
        print(f"Macro Precision:         {self.metrics['macro_precision'] * 100:.2f}%")
        print(f"Macro Recall:            {self.metrics['macro_recall'] * 100:.2f}%")
        print(f"Macro F1-Score:          {self.metrics['macro_f1_score'] * 100:.2f}%")
        print(f"False Alarm Rate (FAR):  {self.metrics['false_alarm_rate'] * 100:.2f}%\n")

        print(f"{'Class Name':<15} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
        print("-" * 65)
        for c_name, c_data in self.metrics["per_class_metrics"].items():
            print(
                f"{c_name:<15} | {c_data['precision'] * 100:>8.2f}% | "
                f"{c_data['recall'] * 100:>8.2f}% | {c_data['f1_score'] * 100:>8.2f}% | "
                f"{c_data['support']:>8,}"
            )
        print("-" * 65)

        print("\nConfusion Matrix (Rows: Ground Truth, Columns: Predicted):")
        header = " " * 12 + " ".join([f"{c[:8]:>9}" for c in self.classes])
        print(header)
        for idx, row in enumerate(self.metrics["confusion_matrix"]):
            row_str = " ".join([f"{val:>9,}" for val in row])
            print(f"{self.classes[idx][:10]:<10} : {row_str}")

        print("\nTop 5 Predictive Features (Random Forest Gini Importance):")
        for rank, f_info in enumerate(self.metrics["feature_importance_ranking"][:5], 1):
            print(f"  {rank}. {f_info['feature']:<22} : {f_info['importance'] * 100:.2f}%")
        print("-" * 70)


def run_training_pipeline() -> Dict[str, Any]:
    """Convenience entrypoint to execute the complete training flow."""
    trainer = HFGnssEnsembleClassifier()
    return trainer.train()


if __name__ == "__main__":
    run_training_pipeline()
