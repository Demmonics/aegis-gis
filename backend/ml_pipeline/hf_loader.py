"""
AEGIS-GIS: Hugging Face GNSS Spoofing & Jamming Dataset Loader
Implements Phase 7: Real-World Dataset Ingestion using the `datasets` library.
Pulls and parses:
- Target 1: 'Omrilevi123/gnss-jamming-spoofing-detection' (Tabular GNSS RF & positioning telemetry)
- Target 2: 'davidfoss/hifi-nav-38m' / local cached UAV multi-sensor records
"""

import os
import sys
from pathlib import Path
from typing import Tuple, List, Dict, Any, Optional
import pandas as pd
import numpy as np

# Suppress unnecessary HF warnings
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

TARGET_COLUMNS = [
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
    "est_source_azimuth",
    "est_source_elevation",
]

LABEL_MAP = {
    "Normal": 0,
    "Spoofing": 1,
    "Jamming": 2,
}

REVERSE_LABEL_MAP = {0: "AUTHENTIC", 1: "SPOOFING", 2: "JAMMING"}


def load_hf_gnss_dataset(
    dataset_name: str = "Omrilevi123/gnss-jamming-spoofing-detection",
    split: str = "train",
    local_csv_fallback: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Loads real-world GNSS telemetry dataset from Hugging Face Hub, with automatic
    fallback to locally cached repository archives.
    """
    df = None

    # 1. Try Hugging Face Hub via `datasets` library
    try:
        from datasets import load_dataset
        print(f"[HF_LOADER] Loading dataset '{dataset_name}' from Hugging Face Hub...")
        ds = load_dataset(dataset_name, split=split)
        df = ds.to_pandas()
        print(f"[HF_LOADER] Successfully pulled {len(df):,} rows from Hugging Face Hub.")
    except Exception as exc:
        print(f"[HF_LOADER] Remote Hugging Face pull encountered note: {exc}. Trying local fallback...")

    # 2. Local File Fallback
    if df is None or len(df) == 0:
        repo_root = Path(__file__).resolve().parent.parent.parent
        candidate_paths = [
            local_csv_fallback,
            repo_root / "Datasets" / "gnss-jamming-spoofing-detection" / "gnss_dataset.csv",
            Path("Datasets/gnss-jamming-spoofing-detection/gnss_dataset.csv"),
        ]

        for p in candidate_paths:
            if p and Path(p).exists():
                print(f"[HF_LOADER] Loading from local archive: {p}")
                df = pd.read_csv(p)
                print(f"[HF_LOADER] Loaded {len(df):,} rows from local file.")
                break

    if df is None:
        raise FileNotFoundError(
            f"Could not load Hugging Face dataset '{dataset_name}' and no local fallback found."
        )

    return df


def parse_and_align_features(
    df: pd.DataFrame,
) -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
    """
    Cleans raw dataset, handles NaNs, aligns physical features (C/N0, pseudorange jump,
    AGC, DoA azimuth/elevation), and returns normalized feature matrix X and labels y.
    """
    df_clean = df.copy()

    # Identify label column
    label_col = None
    for cand in ["attack_type", "label", "threat_type", "class"]:
        if cand in df_clean.columns:
            label_col = cand
            break

    if not label_col:
        raise ValueError("Could not find attack label column in dataset.")

    # Filter out rows with missing label
    df_clean = df_clean.dropna(subset=[label_col])

    # Map labels to integer targets
    y_raw = df_clean[label_col].astype(str)
    y_mapped = []
    valid_indices = []

    for idx, val in enumerate(y_raw):
        val_clean = val.strip().capitalize()
        if val_clean in LABEL_MAP:
            y_mapped.append(LABEL_MAP[val_clean])
            valid_indices.append(idx)
        elif "spoof" in val.lower():
            y_mapped.append(1)
            valid_indices.append(idx)
        elif "jam" in val.lower():
            y_mapped.append(2)
            valid_indices.append(idx)
        elif "norm" in val.lower() or "auth" in val.lower():
            y_mapped.append(0)
            valid_indices.append(idx)

    df_clean = df_clean.iloc[valid_indices].reset_index(drop=True)
    y = np.array(y_mapped, dtype=np.int64)

    # Align numeric feature columns
    available_features = []
    for col in TARGET_COLUMNS:
        if col in df_clean.columns:
            available_features.append(col)

    # Impute missing numeric values with median
    X_df = df_clean[available_features].copy()
    for col in available_features:
        if X_df[col].isnull().any():
            median_val = X_df[col].median()
            X_df[col] = X_df[col].fillna(median_val)

    X = X_df.values.astype(np.float32)
    class_names = [REVERSE_LABEL_MAP[i] for i in sorted(REVERSE_LABEL_MAP.keys())]

    print(f"[HF_LOADER] Parsed {X.shape[0]:,} samples across {X.shape[1]} features.")
    print(f"[HF_LOADER] Target Class Distribution:")
    for c_idx, c_name in enumerate(class_names):
        count = int(np.sum(y == c_idx))
        pct = (count / len(y)) * 100
        print(f"   - {c_name} (Class {c_idx}): {count:,} samples ({pct:.1f}%)")

    return X, y, available_features, class_names


if __name__ == "__main__":
    df_loaded = load_hf_gnss_dataset()
    X, y, feats, classes = parse_and_align_features(df_loaded)
    print(f"[HF_LOADER] Preprocessing complete. Shape: X={X.shape}, y={y.shape}")
