# AEGIS-GIS: Master System Architecture & Research Specification
> **IMPORTANT FOR AUTONOMOUS CODING AGENT (ANTIGRAVITY):**  
> This document is the authoritative technical blueprint for **AEGIS-GIS**. Every module, mathematical formula, API endpoint, database collection, and UI component you build must adhere strictly to this specification and to the research paper *"When Location Lies: GNSS Spoofing and the Vulnerability of Geographic Positioning Systems"* (K.J. Somaiya College of Engineering, Dept. of AI & DS).

---

## 1. High-Level System Architecture

```
+---------------------------------------------------------------------------------------------------+
|                        AEGIS-GIS CYBER-GEOSPATIAL COMMAND CENTER (React + Vite)                   |
|  +-----------------------+  +------------------------+  +------------------+  +----------------+  |
|  | 2D/3D Tactical WebGIS |  | RF Correlator & SQM    |  | 5-Layer Defense  |  | Local Qwen-4B  |  |
|  | Map (Leaflet/Deck.gl) |  | Telemetry Oscilloscope |  | & ML Diagnostics |  | Forensic Agent |  |
|  +-----------+-----------+  +------------+-----------+  +--------+---------+  +--------+-------+  |
+--------------|---------------------------|-----------------------|---------------------|----------+
               | REST + WebSocket Stream   |                       |                     |
+--------------v---------------------------v-----------------------v---------------------v----------+
|                               FASTAPI ASYNC BACKEND SERVER (Python 3.11+)                         |
|                                                                                                   |
|  +-----------------------------------------------+  +------------------------------------------+  |
|  | 1. GNSS RF & Pseudorange Physics Simulator    |  | 2. 5-Layer Spoofing Defense Engine       |  |
|  | - WGS-84 <-> ECEF <-> UTM Coordinate Engine   |  | - L1: SQM (C/N0, Peak Ratio, Doppler)    |  |
|  | - 6 Spoofing Attack Generators (Sec 4.2)      |  | - L2: Multi-Antenna DoA Spatial Check    |  |
|  | - 4 Real-World Incident Replayers (Sec 5)     |  | - L3: Galileo OS-NMA Crypto Verifier     |  |
|  +-----------------------------------------------+  | - L4: Tightly-Coupled INS/GNSS EKF + RAIM|  |
|                                                     | - L5: RF + XGBoost + 1D-CNN ML Ensemble  |  |
|  +-----------------------------------------------+  +------------------------------------------+  |
|  | 3. GIS Integrity & PyQGIS Pipeline (Sec 8-9)  |  +------------------------------------------+  |
|  | - Shapely/GeoJSON Topology Cross-Checker      |  | 4. Hybrid Edge AI & RAG Orchestrator     |  |
|  | - Sec 8.4 Integrity-Aware GIS Schema Builder  |  | - Ollama Local Qwen-4B / Llama Client    |  |
|  | - Automated PyQGIS Script + .qml Style Gen    |  | - Seamless Gemini 2.5 Flash Fallback     |  |
|  +-----------------------------------------------+  +------------------------------------------+  |
+--------------+---------------------------+-----------------------+---------------------+----------+
               |                           |                       |                     |
     +---------v---------+       +---------v---------+   +---------v---------+ +---------v---------+
     |  QDRANT VECTOR DB |       |  MONGODB 2DSPHERE |   |   SUPABASE AUTH   | |  QGIS / GEOPACKAGE|
     | - Research Paper  |       | - GeoJSON Tracks  |   | - JWT Verification| | - .geojson Export |
     |   RAG Chunks      |       | - Integrity Logs  |   | - Instant Demo    | | - load_qgis.py    |
     | - TEXBAT Attack   |       | - Incident Audits |   |   Professor Mode  | | - .qml Symbology  |
     |   Signature Vecs  |       |   (Local Fallback)|   |   Bypass          | |   Rules           |
     +-------------------+       +-------------------+   +-------------------+ +-------------------+
```

---

## 2. Core Mathematical & Physics Models (Sections 2, 3, 4, 6 of Paper)

### 2.1 Trilateration, Pseudorange & Coordinate Transformations (Section 2.1 & 2.2)
For $N \ge 4$ visible satellites across multi-constellation GNSS (GPS, GLONASS, Galileo, BeiDou, NavIC), the pseudorange measurement $\rho_i$ for satellite $i$ at ECEF coordinates $(x_i, y_i, z_i)$ and receiver true ECEF position $(x_u, y_u, z_u)$ is:

$$\rho_i = \sqrt{(x_i - x_u)^2 + (y_i - y_u)^2 + (z_i - z_u)^2} + c \cdot \delta t_u + I_i + T_i + \epsilon_i + S_i(t)$$

where:
- $c = 2.99792458 \times 10^8\text{ m/s}$ is the speed of light,
- $\delta t_u$ is the receiver clock bias,
- $I_i, T_i$ are ionospheric and tropospheric delays,
- $\epsilon_i \sim \mathcal{N}(0, \sigma_\rho^2)$ is thermal measurement noise,
- $S_i(t)$ is the injected spoofing perturbation for attack class $k \in \{0, 1, \dots, 6\}$.

The backend must implement exact transformations between:
1. **Geodetic WGS-84** $(\phi, \lambda, h)$
2. **Earth-Centered Earth-Fixed (ECEF)** $(X, Y, Z)$
3. **Projected UTM Coordinates** $(\text{Easting}, \text{Northing}, \text{Zone})$ to demonstrate Section 2.2 (*"if the underlying GNSS fix has already been spoofed then the reprojected coordinate is simply a false coordinate expressed in a different and equally confident looking system"*).

### 2.2 Mathematical Signatures of the 6 Spoofing Attack Types (Section 4.2)
Every telemetry tick $t$ produces a 16-dimensional feature vector per epoch. The physics generator must accurately model all 6 attack classes from Section 4.2 of the review paper:

1. **`AUTHENTIC` (Class 0):**
   - $C/N_0 \in [41.0, 46.5]\text{ dB-Hz}$, symmetric correlation peak ($R_{\text{sym}} \approx 1.0$), consistent Doppler shift $\Delta f_D = -\frac{v_{\text{rel}}}{\lambda_{\text{L1}}}$, low pseudorange residual $r_{\text{RAIM}} < 2.5\text{ m}$, authenticated OS-NMA flag, consistent multi-antenna azimuth dispersion $\sigma_{\text{DoA}} > 45^\circ$.
2. **`SIMPLISTIC_NON_SYNC` (Class 1 — Simplistic Non-Synchronized Spoofing):**
   - High-power unsynchronized signal broadcast ($C/N_0$ spikes to $52\text{--}58\text{ dB-Hz}$), abrupt step jump in position ($\Delta p > 150\text{ m}$ in a single epoch) and receiver clock bias jump ($c \cdot \Delta \delta t_u > 300\text{ m}$), severe Doppler-pseudorange rate mismatch, single-transmitter DoA collapse ($\sigma_{\text{DoA}} < 3^\circ$).
3. **`INTERMEDIATE_SYNC` (Class 2 — Intermediate Synchronized Spoofing):**
   - Attacker estimates target position/velocity first, aligns counterfeit code phase with authentic signal, then gradually increases power by $+2\text{ to }+4\text{ dB}$ during the pull-off phase. Causes characteristic **Early-Late correlation peak distortion** ($M_{\text{ratio}}$ asymmetry $> 0.28$) as counterfeit and genuine correlation triangles overlap before the tracking loop locks onto the fake trajectory.
4. **`SOPHISTICATED_RECEIVER_AWARE` (Class 3 — Sophisticated Multi-Antenna Receiver-Aware Spoofing):**
   - Coordinated multi-transmit array matches power ($C/N_0 \approx 45\text{ dB-Hz}$) and mimics spatial DoA geometry, defeating basic SQM and single-antenna checks. Detected via **Tightly-Coupled INS/GNSS Extended Kalman Filter innovation divergence** ($\gamma_{\text{EKF}} = \mathbf{y}_k^T \mathbf{S}_k^{-1} \mathbf{y}_k$) and **GIS Spatial Topology constraints**!
5. **`MEACONING` (Class 4 — Time-Delayed Rebroadcast):**
   - Genuine satellite signals recorded at attacker location $\mathbf{p}_{\text{rec}}$ and rebroadcast with processing delay $\tau_{\text{meac}} > 0$. Exhibits authentic-looking inter-satellite relative geometry and valid OS-NMA bits initially, but produces a uniform common-mode clock bias jump $c \cdot \tau_{\text{meac}}$ and sudden spatial displacement to the rebroadcaster's reference coordinates.
6. **`NULLING_SUPPRESSION` (Class 5 — Nulling / Signal Suppression):**
   - Attacker transmits a phase-inverted antipodal carrier ($180^\circ$ out of phase) to null authentic signals before injecting decoy satellites. Manifests as a sharp transient dip in $C/N_0$ (drop of $8\text{--}12\text{ dB-Hz}$ for $1\text{--}3$ epochs) accompanied by carrier phase cycle slips and abnormal Automatic Gain Control (AGC) drop before synthetic lock.
7. **`DRIFT_EVASIVE_UAV` (Class 6 — Drift-Evasive RL-Targeted Spoofing, Panda & Guo 2025 `arXiv:2507.11173`):**
   - Gradual sub-threshold pseudorange perturbation ($\dot{S}_i(t) \approx 0.15\text{--}0.45\text{ m/s}$) specifically engineered to stay below instantaneous $\chi^2$ RAIM thresholds while cumulatively drifting a UAV or tractor $20\text{--}80\text{ m}$ off its survey corridor. Detected via **Temporal Windowed ML (1D-CNN / Sequential Residual Accumulator / CUSUM)** + INS velocity integration + GIS corridor boundary checks.

---

## 3. The 5-Layer Detection & Mitigation Engine (Table 2 & Section 6)

### Layer 1: Signal Quality Monitoring (SQM — Section 6.1)
Computes three real-time correlator indicators using Early ($I_E, Q_E$), Prompt ($I_P, Q_P$), and Late ($I_L, Q_L$) in-phase/quadrature taps at spacing $d = 0.5\text{ chips}$:
- **Ratio Metric:**
  $$M_{\text{ratio}} = \frac{E + L}{\alpha \cdot P}, \quad E = \sqrt{I_E^2 + Q_E^2}, \; P = \sqrt{I_P^2 + Q_P^2}, \; L = \sqrt{I_L^2 + Q_L^2}$$
- **Delta Symmetry Metric:**
  $$M_{\Delta} = \frac{E - L}{2 P}$$
- **$C/N_0$ Moving Variance (Electronics 2022 [7]):**
  $$\sigma^2_{C/N_0}(k) = \frac{1}{W} \sum_{j=k-W+1}^{k} \left( C/N_0(j) - \mu_{C/N_0} \right)^2$$

### Layer 2: Multi-Antenna Direction of Arrival (DoA — Section 6.2)
Compares measured carrier phase difference $\Delta \phi_i$ across a simulated dual/quad antenna baseline against the expected azimuth/elevation $(\text{Az}_i, \text{El}_i)$ computed from the broadcast ephemeris. If all $N$ satellites exhibit colinear arrival vectors ($\text{Var}(\text{Az}_{\text{measured}}) < \tau_{\text{DoA}}$), flags single-source transmitter spoofing.

### Layer 3: Cryptographic Navigation-Message Authentication (Galileo OS-NMA — Section 6.3)
Simulates TESLA keychain MAC verification on navigation subframes. Verifies whether the digital signature matches the satellite PRN root key and whether replay timing falls within the strict synchronization window.

### Layer 4: Tightly-Coupled GNSS/INS Extended Kalman Filter (EKF) & RAIM (Section 6.4)
- **RAIM Weighted Least Squares Residual:**
  $$\mathbf{r} = \mathbf{z} - \mathbf{H} \hat{\mathbf{x}}_{\text{WLS}}, \quad \text{SSE} = \mathbf{r}^T \mathbf{W} \mathbf{r} \sim \chi^2_{N-4}$$
- **INS/GNSS Extended Kalman Filter:**
  Maintains state vector $\mathbf{x}_k = [\phi, \lambda, h, v_N, v_E, v_D, b_{\text{clk}}, \dot{b}_{\text{clk}}]^T$ propagated using strapdown IMU accelerometer/gyroscope measurements.
  At each GNSS epoch, computes the **Normalized Innovation Squared (NIS)** Mahalanobis distance:
  $$\gamma_k = \mathbf{y}_k^T \mathbf{S}_k^{-1} \mathbf{y}_k, \quad \mathbf{y}_k = \mathbf{z}_{\text{GNSS}, k} - \mathbf{H} \hat{\mathbf{x}}_{k|k-1}$$
  **Crucial Mitigation Capability (Section 6.6 Layered Defense):** When $\gamma_k > \tau_{\text{EKF}}$ or the ML classifier flags spoofing, the EKF **automatically rejects the spoofed GNSS measurement update** (or down-weights $\mathbf{R}_k \to \infty$) and continues navigating smoothly on IMU dead-reckoning + spatial map matching, generating the **Reconstructed Trusted Trajectory**!

### Layer 5: Multi-Parameter Machine Learning & Deep Learning Ensemble (Section 6.5)
Trains and runs an ensemble of:
1. **Random Forest Classifier** (100 trees, interpretable feature importances)
2. **Gradient Boosting / XGBoost Classifier** (high tabular accuracy on SQM + RAIM residuals)
3. **Temporal 1D-CNN / MLP Neural Network** (captures sliding-window temporal drift patterns across $W=10$ epochs to catch Class 6 Drift-Evasive spoofing)

**14 Input Features per Epoch:**
1. `cn0_mean_dbhz` ($C/N_0$ mean across tracked satellites)
2. `cn0_moving_variance` (Windowed $C/N_0$ variance)
3. `sqm_ratio_metric` (Correlator peak ratio $M_{\text{ratio}}$)
4. `sqm_delta_asymmetry` (Early-Late peak asymmetry $M_{\Delta}$)
5. `clock_bias_jump_m` ($c \cdot \Delta \delta t_u$)
6. `clock_drift_mps` ($c \cdot \dot{\delta t}_u$)
7. `pseudorange_residual_rms` (RAIM WLS residual RMS)
8. `doppler_pseudorange_rate_diff` ($\left| \dot{\rho} + \lambda_{\text{L1}} f_D \right|$)
9. `carrier_phase_slip_ratio` (Cycle slip indicator)
10. `agc_gain_level_db` (Front-end Automatic Gain Control)
11. `doa_azimuth_variance_deg` (Multi-antenna spatial variance)
12. `ekf_innovation_mahalanobis` (INS vs GNSS kinematic innovation $\gamma_k$)
13. `cumulative_drift_cusum` (Sequential CUSUM drift accumulator)
14. `pdop_dilution` (Position Dilution of Precision)

---

## 4. Integrity-Aware GIS Data Model & GIS-Assisted Detection (Sections 8 & 9)

### 4.1 Section 8.4 Standardized Integrity-Aware GIS Schema
Every spatial observation exported to GeoJSON, stored in MongoDB, or loaded into QGIS **must** follow this exact GeoJSON `Feature` schema implementing Section 8.4 of the paper:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [20.4567, 54.7123]
  },
  "properties": {
    "observation_id": "obs_20261020_0042",
    "scenario_id": "baltic_maritime_c4ads",
    "receiver_type": "Multi-Constellation Dual-Freq RTK + IMU",
    "constellations_tracked": ["GPS", "Galileo", "GLONASS", "NavIC"],
    "timestamp_utc": "2026-10-20T18:00:42Z",
    "crs_epsg": "EPSG:4326",
    "utm_projection": {
      "zone": "34N",
      "easting_m": 465012.34,
      "northing_m": 6062891.12
    },
    "estimated_accuracy_m": 1.25,
    "pdop": 1.4,
    "satellite_count": 11,
    "cn0_dbhz": 54.8,
    "correction_status": "RTK_FIXED_SPOOFED",
    "authentication_status": "OSNMA_FAILED",
    "integrity_status": "SPOOFING_DETECTED_MITIGATED",
    "independent_sensor_validated": false,
    "gis_topology_check": {
      "passed": false,
      "violation_type": "MARITIME_VESSEL_ON_LAND_RUNWAY",
      "distance_from_valid_corridor_m": 14250.5
    },
    "ml_classification": {
      "is_spoofed": true,
      "predicted_attack_type": "INTERMEDIATE_SYNC",
      "confidence_score": 0.992,
      "layer_flags": {
        "sqm_anomaly": true,
        "doa_anomaly": true,
        "osnma_auth_fail": true,
        "ekf_raim_divergence": true,
        "gis_spatial_conflict": true
      }
    },
    "mitigated_recovery_geometry": {
      "type": "Point",
      "coordinates": [19.8912, 54.6801],
      "recovery_method": "TIGHTLY_COUPLED_INS_EKF_DEAD_RECKONING"
    }
  }
}
```

### 4.2 Automated PyQGIS Integration (`qgis_export/load_aegis_into_qgis.py`)
The backend must dynamically generate a downloadable **QGIS Integration Bundle** containing:
1. `aegis_raw_reported_track.geojson` (The corrupted GNSS coordinates reported by the spoofed receiver)
2. `aegis_ekf_recovered_track.geojson` (The EKF + GIS mitigated true path)
3. `aegis_integrity_points.geojson` (Point layer with all Section 8.4 integrity attributes)
4. `load_aegis_into_qgis.py` (A standalone PyQGIS script that can be run inside the QGIS Python Console to automatically load all 3 layers, apply rule-based color styling, add integrity callout labels, and zoom to the incident extent).