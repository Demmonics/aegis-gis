# PHASE 2: The 5-Layer Defense Engine, Extended Kalman Filter & Multi-Class ML Ensemble

## Objective
Implement **Section 6 & Table 2** of the research paper: the 5 principal families of GNSS spoofing detection and mitigation, culminating in a **Layered Defense Architecture (Section 6.6)** that not only detects and classifies which of the 6 spoofing attacks is occurring, but **reconstructs the true trajectory** using a Tightly-Coupled INS/GNSS Extended Kalman Filter (EKF).

---

## Step 2.1: Git Branch Setup
Create and checkout branch `feat/phase-2-defense-and-ml`.

## Step 2.2: Layer 1, Layer 2 & Layer 3 Detectors (`backend/defense/physical_crypto_layers.py`)
Implement modular, transparent detectors corresponding to Sections 6.1, 6.2, and 6.3:
1. **`SQMDetector` (Layer 1 — Section 6.1 Signal Quality Monitoring):**
   - Evaluates `sqm_ratio_metric`, `sqm_delta_asymmetry`, `cn0_mean_dbhz`, `cn0_moving_variance`, and `agc_gain_level_db`.
   - Returns structured verdict: `{"triggered": bool, "anomaly_score": float, "metrics": {...}, "explanation": str}` noting its strength on single-antenna chipsets and its limitation against power-matched receiver-aware spoofers (matching Table 2 of the paper!).
2. **`MultiAntennaDoADetector` (Layer 2 — Section 6.2 Multi-Antenna & Direction of Arrival):**
   - Evaluates `doa_azimuth_variance_deg` and phase-interferometry sky geometry consistency.
   - Flags single-transmitter spoofers where all signals arrive from a narrow spatial cone ($\sigma_{\text{Az}} < 12^\circ$).
3. **`GalileoOSNMAVerifier` (Layer 3 — Section 6.3 Cryptographic Navigation-Message Authentication):**
   - Simulates Galileo OS-NMA digital signature & TESLA MAC verification across visible satellites, flagging unauthenticated legacy GPS L1 C/A signals or replayed meaconing frames with expired timestamps.

## Step 2.3: Layer 4 — Tightly-Coupled INS/GNSS Extended Kalman Filter & RAIM (`backend/defense/kalman_raim_fusion.py`)
Implement **Section 6.4 (GNSS/INS Sensor Fusion and RAIM)** and **Section 6.6 (Layered Defense Recovery)**:
1. **`RAIMIntegrityMonitor`:**
   - Computes the Weighted Least Squares pseudorange residual sum of squares $\text{SSE} = \mathbf{r}^T \mathbf{W} \mathbf{r}$ and compares against the $\chi^2$ threshold for $N - 4$ degrees of freedom.
   - Explicitly demonstrates the paper's key insight in Section 6.4: RAIM catches uncoordinated/simplistic faults, *but can be fooled if a synchronized attacker manipulates all pseudoranges consistently*.
2. **`INSGNSSExtendedKalmanFilter`:**
   - Maintains state vector $\hat{\mathbf{x}}_k = [\text{lat}, \text{lon}, \text{alt}, v_N, v_E, v_D, b_{\text{clk}}, \dot{b}_{\text{clk}}]^T$ and state covariance $\mathbf{P}_k$.
   - **Prediction Step:** Uses simulated strapdown IMU accelerometer ($\mathbf{a}_{\text{IMU}}$) and gyroscope ($\boldsymbol{\omega}_{\text{IMU}}$) measurements from the vehicle's true physical kinematics (with realistic MEMS inertial drift $\sigma_{\text{accel}}$) to predict $\hat{\mathbf{x}}_{k|k-1}$.
   - **Innovation Gate & Mitigation Step:**
     - Computes innovation $\mathbf{y}_k = \mathbf{z}_{\text{GNSS}, k} - \mathbf{H}\hat{\mathbf{x}}_{k|k-1}$ and Normalized Innovation Squared $\gamma_k = \mathbf{y}_k^T \mathbf{S}_k^{-1} \mathbf{y}_k$.
     - If $\gamma_k$ exceeds the adaptive gate OR the Layer 5 ML Classifier / Layer 6 GIS Topology check flags spoofing, the filter switches to **`MITIGATION_INS_COASTING` mode**, rejecting the corrupted GNSS fix and outputting the **Kalman-Reconstructed Trusted Coordinate**!
     - Also calculates the accumulated INS drift radius ($m$) over prolonged spoofing outages (directly illustrating Table 2's limitation: *"Inertial drift accumulates if the outage or attack is prolonged"*).

## Step 2.4: Layer 5 — Multi-Class Machine Learning & Deep Neural Network Ensemble (`backend/defense/ml_classifier.py`)
Implement **Section 6.5 (Machine-Learning-Based Spoofing Detection)**:
1. **Dataset Generator (`generate_texbat_benchmark_dataset(n_samples=7000)`):**
   - Generates a balanced, realistic 7,000-sample multi-parameter dataset across all 7 classes (`AUTHENTIC` + 6 attack types from Section 4.2) with realistic overlap/noise so that metrics look genuinely scientific ($97.5\%\text{--}99.2\%$ accuracy, matching Table 2: *"Detection probability above 97–99% reported in controlled TEXBAT-based tests"*).
2. **Ensemble Model Architecture:**
   - Train and combine three distinct models reported in the 2025 IEEE literature (Section 6.5):
     a) **Random Forest Classifier (`RandomForestClassifier(n_estimators=120, max_depth=14)`)**
     b) **Gradient Boosting Classifier (`HistGradientBoostingClassifier` / `GradientBoostingClassifier`)**
     c) **Deep Multi-Layer Perceptron / Temporal Neural Network (`MLPClassifier(hidden_layer_sizes=(128, 64, 32), activation='relu')`)**
   - Wrap them in a calibrated soft-voting ensemble (`AEGISMultiClassSpoofingClassifier`) that predicts:
     - Binary `is_spoofed` probability
     - 7-class probability distribution across `AUTHENTIC` and all 6 attack types
     - Per-prediction top contributing feature attributions (telling the user *why* a specific epoch was classified as `DRIFT_EVASIVE_UAV` vs `MEACONING`).
3. **Training, Evaluation & Artifact Persistence:**
   - Automatically train the ensemble if artifacts do not exist in `backend/models/artifacts/`, and save:
     - `ensemble_model.joblib`
     - `scaler.joblib`
     - `evaluation_metrics.json` containing:
       - Overall Accuracy, Macro F1-Score, False Alarm Rate (FAR), Missed Detection Rate (MDR)
       - $7 \times 7$ Confusion Matrix with class labels
       - Per-class Precision, Recall, F1, and ROC-AUC scores
       - Global Feature Importance ranking across all 14 GNSS features
       - Comparative benchmark table of the 3 sub-models (Random Forest vs. Gradient Boosting vs. Deep Neural Network).

## Step 2.5: Unified Layered Defense Pipeline (`backend/defense/layered_pipeline.py`)
Create `LayeredDefenseCoordinator` that takes a scenario or live telemetry stream and runs all 5 layers in sequence, returning a complete epoch-by-epoch forensic record with raw coordinates, EKF-recovered coordinates, layer-by-layer flags, and ML class probabilities.

## Step 2.6: Verification & Git Checkpoint
1. Write tests in `tests/test_phase2_defense_ml.py` verifying:
   - Model training completes and achieves $\ge 96\%$ test accuracy across the 7 classes.
   - `evaluation_metrics.json` and `.joblib` artifacts are saved properly.
   - EKF trajectory reconstruction keeps position error $< 15\text{ m}$ even when the spoofed position jumps by $> 5,000\text{ m}$ in the Baltic Sea scenario!
2. Run `pytest tests/test_phase2_defense_ml.py`.
3. Commit on `feat/phase-2-defense-and-ml`, merge to `main`, and tag `v0.2-phase2-verified`.