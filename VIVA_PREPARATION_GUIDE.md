# AEGIS-GIS: Viva Defense & Professor Presentation Master Guide
**Department of Artificial Intelligence & Data Science**  
**K.J. Somaiya College of Engineering (KJSCE), Mumbai**  
**Batch B2:** Yoosha, Yash, Parth, Tanishq  
**Project:** *AEGIS-GIS: When Location Lies — Multi-Layered GNSS Spoofing Detection, EKF Sensor Fusion & Integrity-Aware GIS Pipeline*  
**Date:** Morning Viva Evaluation

---

## 1. Executive Summary & Project Positioning

### The Problem
Global Navigation Satellite Systems (GNSS: GPS, Galileo, GLONASS, BeiDou) are the bedrock of modern spatial infrastructure. However, civilian GNSS signals (e.g., GPS L1 C/A at 1575.42 MHz) are **unencrypted, unauthenticated, and arrive at Earth with minuscule power (-160 dBW / $10^{-16}$ W)** — far weaker than ambient cosmic RF noise.

SDRs (Software Defined Radios like HackRF One, BladeRF, USRP) costing under \$300 can easily overpower authentic satellite signals. The adversary can execute:
- **Meaconing / Replay attacks** (recording and re-transmitting with delay)
- **Coordinated Constellation Spoofing** (generating synthetic ephemeris that slowly drags the calculated PVT fix)
- **Asynchronous Code/Carrier Slewing** (injecting phase-coherent false peaks into correlators)

### The Downstream GIS Blindspot
Existing receiver defenses operate in an isolated RF silo. Traditional Geographic Information Systems (GIS like ArcGIS, QGIS, Leaflet, GeoServer) blindly ingest latitude and longitude coordinates over NMEA 0183 sentences (`$GPGGA`, `$GPRMC`) without cryptographic provenance or signal integrity metrics. When a vessel in the Baltic Sea or an airliner near Vilnius is spoofed, downstream automated systems (ECDIS, ADS-B, autopilot) make catastrophic decisions because **"Location Lies"**.

### The AEGIS-GIS Solution
AEGIS-GIS introduces the world's first **end-to-end cyber-physical to geospatial defense pipeline**:
1. **RF & Physical Layer Defenses:** 41-tap Signal Quality Monitoring (SQM), Multi-Antenna Angle of Arrival (DoA) spatial collapse detection, and Galileo OS-NMA cryptographic TESLA authentication.
2. **Kinematic & Mathematical Filtering:** 8-state Tightly-Coupled INS/GNSS Extended Kalman Filter (EKF) with innovation Mahalanobis gating and RAIM $\chi^2$ residual checks.
3. **Machine Learning Classifier:** Soft-voting ensemble (Random Forest + HistGradientBoosting + Multi-Layer Perceptron) trained on 7,000+ TEXBAT-grade telemetry vectors achieving **98.8% accuracy** and **<0.8% False Alarm Rate**.
4. **Section 8 & 9 Integrity-Aware GIS Engine:** Real-time Shapely spatial topology cross-checking that flags impossible vessel movements across landmasses, aerodrome incursions, and autonomous vehicle corridor escapes.
5. **Standardized Section 8.4 GeoJSON Schema & PyQGIS Automation:** Dynamic export of integrity attributes with auto-generated QGIS visualization scripts and color-coded `.qml` styling.
6. **Local Edge AI Copilot:** Ollama-powered Qwen-4B / Gemini hybrid forensic analyst that explains attack telemetry and cites literature ([1]-[20]) in real-time.

---

## 2. 5-Minute Team Presentation Script

### 00:00 - 01:15 | Lead Overview & Architecture (Yoosha)
> *"Respected Professor and evaluators, good morning. We are Batch B2, and today we present **AEGIS-GIS: When Location Lies**.
> 
> Most cybersecurity projects look at networks and firewalls. Our project looks at the invisible physical substrate of all modern GIS: **Satellite Positioning**. In modern asymmetric warfare and cyber-crime — from the Black Sea and Baltic Sea to commercial airline routes in Eastern Europe — adversaries broadcast false GNSS signals to silently hijack autonomous navigation systems.
> 
> The core problem is that downstream GIS platforms blindly trust incoming $(x, y, z)$ coordinates. We have designed, implemented, and verified a 5-layer consensus defense pipeline that catches spoofing at the RF correlator, filters false fixes using an Extended Kalman Filter, validates fixes against spatial topologies in GIS, and serializes integrity metadata into our proposed Section 8.4 GIS schema.
> 
> Let's look at how the physical signal is simulated and attacked, led by Yash."*

### 01:15 - 02:15 | RF Physics Engine & Mathematical Modeling (Yash)
> *"Thank you, Yoosha. In Phase 1, we implemented the WGS-84 ellipsoidal transformation using Bowring's closed-form algorithm, achieving sub-millimeter geodesy conversion into ECEF and UTM projection coordinates.
> 
> Rather than using simple random numbers, our simulator models the true RF correlator multicooker across 41 delay taps ($\tau \in [-2.0, +2.0]$ chips). An authentic signal produces a clean triangular cross-correlation peak. Under a **Symmetric / Asymmetric Code Drag-Off (TEXBAT ds3/ds4)** or an **Adversarial Noise Injection (ds8)**, the correlation curve distorts with secondary lobes.
> 
> We modeled four full-scale real-world scenarios from recent declassified defense literature:
> 1. The Baltic Sea C4ADS Maritime Attack (spoofing a tanker onto a naval airfield runway).
> 2. The Ryanair Vilnius Aviation incident (ADS-B velocity shear and 2004 clock reset).
> 3. An autonomous UAV LiDAR survey experiencing evasive drift.
> 4. A precision agriculture RTK autonomous tractor deviating from row boundaries.
> 
> Parth will now explain how our 5 defense layers detect and isolate these attacks."*

### 02:15 - 03:30 | 5-Layer Defense & Machine Learning (Parth)
> *"Thank you, Yash. As detailed in Table 2 of our research paper, no single defense layer is sufficient. We engineered a 5-layer defense matrix:
> - **Layer 1: Signal Quality Monitoring (SQM).** We calculate the Ratio Metric ($P_E + P_L / 2P_P$), Delta Asymmetry ($P_E - P_L$), and $C/N_0$ variance. Distortions trigger an immediate RF alert.
> - **Layer 2: Multi-Antenna DoA.** Authentic satellites arrive from diverse elevation and azimuth angles. A single terrestrial spoofing antenna broadcasts all signals from one direction, causing spatial collapse ($Var(\theta) < 0.05$).
> - **Layer 3: Galileo OS-NMA.** We simulate the cryptographic TESLA protocol verifying root key chains and Digital Signatures across the navigation message.
> - **Layer 4: Tightly-Coupled EKF & RAIM.** Our 8-state Extended Kalman Filter tracks position, velocity, and clock bias. When the spoofer drags the receiver, the innovation vector $y_k = z_k - H\hat{x}_{k|k-1}$ breaches the Mahalanobis gate ($D_M > 3.0$). In our Baltic Sea test, when raw GPS jumped over 14 kilometers inland, our EKF dead-reckoning constrained the true reconstructed trajectory to within **1.969 meters**!
> - **Layer 5: Machine Learning Classifier.** We trained a soft-voting ensemble of Random Forest, HistGradientBoosting, and Deep MLP over 7,000 balanced epochs. It delivers **98.8% test accuracy** with a False Alarm Rate under 0.8%, identifying not just if an attack is happening, but distinguishing between 6 specific attack classes.
> 
> Tanishq will now demonstrate how this feeds into downstream GIS and PyQGIS."*

### 03:30 - 04:30 | Integrity-Aware GIS Pipeline & PyQGIS (Tanishq)
> *"Thank you, Parth. Section 8 and 9 of our research paper bridge the gap between RF physics and geospatial intelligence.
> 
> Even if a sophisticated spoofer bypasses basic receiver filters, they cannot fool geospatial reality. Our spatial topology engine uses Shapely to cross-check fixes against boundary polygons in real-time. For maritime traffic, a vessel fix intersecting land or an airfield runway instantly triggers an `IMPOSSIBLE_LAND_TRANSIT` flag. For aviation, deviation from the ILS approach funnel flags an `AIRSPACE_CORRIDOR_DEVIATION`.
> 
> We formalized the **Section 8.4 Integrity-Aware GeoJSON Schema**. Every point feature contains:
> - Spoofing probability ($0.0 - 1.0$)
> - Consensus integrity status (`AUTHENTIC`, `SUSPECT`, `SPOOFED_CRITICAL`)
> - 95% protection error ellipse ($a, b, \theta$)
> - EKF reconstructed coordinates
> - Downstream mitigation recommendations (`ISOLATE_GNSS`, `SWITCH_TO_INS_DEAD_RECKONING`)
> 
> Furthermore, we wrote an automated PyQGIS exporter (`load_into_qgis.py`) and `.qml` styling file that can be loaded directly into desktop QGIS with one click, color-coding authentic green fixes and spoofed red fixes.
> 
> Yoosha will now conclude with our Local AI Copilot and live demonstration."*

### 04:30 - 05:00 | Live Demo & Conclusion (Yoosha)
> *"To make this operational for defense and cyber-analysts, we deployed a local Ollama edge LLM (Qwen-4B) with Gemini hybrid fallback that acts as an autonomous forensic copilot. It ingests the telemetry and Qdrant vector-indexed literature to deliver human-readable mission forensics.
> 
> All 40 unit and integration tests are passing, and our React Cyber Command Center runs cleanly out of the box. We are ready to take your questions and demonstrate any component live."*

---

## 3. Step-by-Step Live Demo Runbook

### Step 1: Open the Application
1. Double click `start_aegis.bat` (or open browser to `http://localhost:8000`).
2. On the authentication screen, point out:
   - *"We have integrated Supabase authentication for enterprise role-based access control, but for academic evaluation, we built this 1-click **Launch KJSCE Professor / Evaluator Demo Mode** button."*
3. Click **"Launch KJSCE Professor / Evaluator Demo Mode"**.

### Step 2: Tactical WebGIS Command Center (Tab 1)
1. Select **"Baltic Sea C4ADS Maritime Runway Spoof"** from the scenario dropdown.
2. Hit the **"Play"** button or drag the 60-epoch scrubber to **Epoch 35**.
3. Point out the three trajectory polylines on the dark Leaflet map:
   - **Dotted Green Line:** Ground Truth authentic shipping channel in the Baltic Sea.
   - **Pulsing Red Line:** Raw Spoofed GNSS fix jumping 14+ kilometers inland onto the Kaliningrad military runway!
   - **Solid Cyan Line:** AEGIS EKF Reconstructed Trajectory staying faithfully in the water corridor.
4. Click on the Red Marker on the runway to show the **Section 8.4 Integrity Popup**:
   - `Integrity Status`: `SPOOFED_CRITICAL`
   - `Spoofing Probability`: `99.2%`
   - `Primary Violation`: `IMPOSSIBLE_LAND_TRANSIT (Vessel inside aerodrome polygon)`
   - `Mitigation`: `ISOLATE_GNSS_RELY_ON_INS_DEAD_RECKONING`

### Step 2.5: The Grand Finale: Cinematic Baltic Sea Spoofing Animation (The "Wow Factor")
1. Click the glowing button: **"🎬 Launch Baltic Sea Spoofing Animation"** (or click the **"🎬 Baltic Spoofing Cinema"** tab).
2. Hit **"Play"** or switch to **"2x Speed"**:
   - **Phase 1 (Epoch 0–14):** Show the green signal connection lines beaming down from the satellite constellation in the sky to the ghosted vessel in the water corridor.
   - **Phase 2 (Epoch 15–25):** At Epoch 15, point out how the satellite lines snap to red, emanating from the hostile coastal SDR radar station with expanding concentric RF waves. The solid ship starts diverging.
   - **Phase 3 (Epoch 26–60):** Watch the solid ship get pulled 14.8 km inland directly onto the Khrabrovo Airport runway. The runway polygon flashes in pulsating red, and the massive alert banner triggers:
     `🚨 CRITICAL GIS VIOLATION: MARITIME VESSEL DETECTED ON INLAND AIRPORT RUNWAY 🚨`
3. Click **"Activate AEGIS Extended Kalman Filter (EKF)"**:
   - Point out the glowing cyan laser tether shooting back from the runway to the authentic waterway.
   - Show how the EKF-restored vessel marker stays safely locked to the shipping lane with an error of just **1.96 meters**!
4. Click **"X"** (top right) to smoothly return to the Tactical Command Center.

### Step 3: Correlator Oscilloscope & Defense Matrix (Bottom Panels)
1. Point to the **41-Tap Correlator Oscilloscope**:
   - Show how the blue curve (authentic) is a clean peak at delay $\tau = 0$.
   - Show how the amber curve (measured) shows multipath/spoofing distortion and peak shifts.
2. Point to the **5 Defense Layer HUD**:
   - Layer 1 (SQM Ratio): Alerted
   - Layer 2 (DoA): Variance collapsed to 0.012 rad
   - Layer 3 (Galileo OS-NMA): TESLA MAC invalid
   - Layer 4 (EKF/RAIM): $\chi^2$ innovation exceeded threshold
   - Layer 5 (ML Ensemble): Prediction `MEACONING_REPLAY (98.6% confidence)`

### Step 4: Machine Learning Diagnostics (Tab 2)
1. Click **"ML Diagnostics"** in the top navigation.
2. Highlight:
   - **Overall Test Accuracy:** `98.8%`
   - **False Alarm Rate:** `<0.8%`
   - **Confusion Matrix:** $7\times 7$ matrix showing zero leakage between authentic and high-risk spoofing.
   - **Feature Importance:** Top features are `doppler_drift_rate`, `sqm_delta_asymmetry`, and `doa_azimuth_std`.

### Step 5: Integrity GIS & PyQGIS (Tab 3)
1. Click **"Integrity GIS & Schema"**.
2. Compare the two cards:
   - **Legacy GIS:** Zero warning, blindly plots vessel in middle of airfield, crashes autopilot.
   - **AEGIS-GIS:** GeoJSON Feature with full Section 8.4 metadata.
3. Show the **PyQGIS script tab**: Explain how `load_into_qgis.py` automates QGIS rendering with `.qml` styling.

### Step 6: Local Edge AI Forensic Copilot (Tab 4)
1. Click **"Forensic AI Copilot"**.
2. Click the quick prompt button: **"Analyze Current Threat"** or **"Explain Baltic Runway Spoofing"**.
3. Watch the local Ollama Qwen model synthesize the telemetry, citing Humphreys [1], Psiaki [3], and Borowski [11] with specific recommendations.

---

## 4. 20 Anticipated Viva Questions & Model Answers

### Q1: What is the exact mathematical difference between WGS-84, ECEF, and UTM?
**Answer:**  
- **WGS-84 (EPSG:4326)** is a geodetic reference system using an oblate spheroid with semi-major axis $a = 6378137.0$ m and flattening $f = 1/298.257223563$. Coordinates are angular: Latitude ($\phi$), Longitude ($\lambda$), and ellipsoidal height ($h$).
- **ECEF (Earth-Centered, Earth-Fixed, EPSG:4978)** is a 3D Cartesian frame $(X, Y, Z)$ rotating with the Earth. The origin is Earth's center of mass, the Z-axis aligns with the IERS Reference Pole, and the X-axis intersects the Prime Meridian.
  - To convert WGS-84 to ECEF:
    $$X = (N(\phi) + h)\cos\phi\cos\lambda$$
    $$Y = (N(\phi) + h)\cos\phi\sin\lambda$$
    $$Z = \left(N(\phi)(1 - e^2) + h\right)\sin\phi$$
    where $N(\phi) = \frac{a}{\sqrt{1 - e^2\sin^2\phi}}$ is the prime vertical radius of curvature, and $e^2 = 2f - f^2 \approx 0.00669437999014$.
  - To convert ECEF to WGS-84, simple iterative methods can diverge near the poles. We implemented **Bowring's closed-form vector algorithm**, which uses parametric latitude $\beta$ and provides sub-millimeter precision in a single step without iteration.
- **UTM (Universal Transverse Mercator)** is a conformal cylindrical map projection that divides the Earth into 60 zones of $6^\circ$ longitude. It projects ellipsoidal coordinates onto planar $(Easting, Northing)$ meters, allowing Euclidean distance calculation without spherical trigonometry.

---

### Q2: How does Signal Quality Monitoring (SQM) detect a spoofing attack at the correlator level?
**Answer:**  
In a standard GNSS tracking loop, the incoming intermediate frequency (IF) signal is correlated with local early ($E$), prompt ($P$), and late ($L$) PRN code replicas spaced by chip intervals (e.g., $\pm 0.5$ chips).  
In an authentic line-of-sight environment, the cross-correlation function is a symmetric triangle:
$$R(\tau) = \Lambda\left(\frac{\tau}{T_c}\right) = \max\left(0, 1 - \frac{|\tau|}{T_c}\right)$$
When a spoofer transmits a counterfeit signal with code offset $\Delta\tau$, the composite correlator output is the linear superposition:
$$R_{comp}(\tau) = R_{auth}(\tau) + \alpha R_{sproof}(\tau - \Delta\tau)e^{j\Delta\theta} + n(\tau)$$
We calculate two core metrics:
1. **Ratio Metric ($M_{ratio}$):**
   $$M_{ratio} = \frac{P_{early} + P_{late}}{2 \cdot P_{prompt}}$$
   In nominal authentic tracking, $P_E \approx P_L \approx 0.5 P_P$, so $M_{ratio} \approx 0.5$. Under spoofing or multipath distortion, energy shifts, elevating the ratio above $0.62$.
2. **Delta Asymmetry Metric ($M_{delta}$):**
   $$M_{delta} = \frac{P_{early} - P_{late}}{P_{prompt}}$$
   Nominally, $M_{delta} = 0$. When a spoofer slews code phase from early to late, $M_{delta}$ spikes significantly positive or negative ($|M_{delta}| > 0.12$).

---

### Q3: Why does conventional RAIM fail against coordinated constellation spoofing?
**Answer:**  
Receiver Autonomous Integrity Monitoring (RAIM) relies on **satellite geometry consistency**. Given $m \ge 5$ pseudorange measurements and a linearized geometry matrix $G$:
$$\Delta\rho = G\Delta x + \epsilon$$
The Least Squares residual vector is:
$$r = (I - G(G^T G)^{-1}G^T)\Delta\rho$$
The test statistic is the sum of squared residuals:
$$SSE = r^T r \sim \sigma^2 \chi^2(m - 4)$$
RAIM assumes that only **one satellite is faulty** (e.g., satellite clock drift or ephemeris anomaly). When one satellite pseudorange is anomalous, $SSE$ exceeds the threshold $T = \chi^2_{1-\alpha}(m-4)$, and the faulty satellite is excluded.

**However, a sophisticated spoofer generates consistent pseudoranges for the ENTIRE constellation.** The spoofer computes a false position $x_{fake}$ and synthesizes pseudoranges for all satellites:
$$\rho_{fake, i} = ||s_i - x_{fake}|| + c\cdot\delta t_{fake}$$
Because all pseudoranges geometrically converge to $x_{fake}$, the residual vector $r \approx 0$! **RAIM calculates zero residual error and declares the solution completely authentic.** This is why Layer 2 (DoA), Layer 3 (OS-NMA), Layer 4 (INS integration), and Layer 5 (ML) are mandatory.

---

### Q4: Explain the mathematical mechanization of the 8-state INS/GNSS Extended Kalman Filter.
**Answer:**  
Our EKF state vector has 8 dimensions:
$$x = \begin{bmatrix} p_N & p_E & p_D & v_N & v_E & v_D & c\delta t & c\dot{\delta}t \end{bmatrix}^T$$
representing NED position, NED velocity, receiver clock bias, and receiver clock drift.
1. **Time Update (Prediction):**
   From time $k-1$ to $k$ with interval $\Delta t$:
   $$\hat{x}_{k|k-1} = F \hat{x}_{k-1|k-1} + B u_k$$
   where the state transition matrix $F$ is:
   $$F = \begin{bmatrix} 
   I_{3\times3} & I_{3\times3}\Delta t & 0_{3\times2} \\
   0_{3\times3} & I_{3\times3} & 0_{3\times2} \\
   0_{2\times3} & 0_{2\times3} & \begin{bmatrix} 1 & \Delta t \\ 0 & 1 \end{bmatrix}
   \end{bmatrix}$$
   The error covariance propagates as:
   $$P_{k|k-1} = F P_{k-1|k-1} F^T + Q$$
   where $Q$ is the process noise covariance matrix reflecting IMU accelerometer noise and clock drift variance.
2. **Measurement Update & Innovation Gating:**
   The GNSS measurement vector $z_k$ (measured position and Doppler velocity) is compared against prediction:
   $$y_k = z_k - H \hat{x}_{k|k-1}$$
   The innovation covariance is:
   $$S_k = H P_{k|k-1} H^T + R_k$$
   Before updating, we compute the **Mahalanobis Distance**:
   $$D_M = \sqrt{y_k^T S_k^{-1} y_k}$$
   - If $D_M < 3.0$ ($\approx 99.7\%$ Gaussian confidence), the measurement is authentic:
     $$K_k = P_{k|k-1} H^T S_k^{-1}$$
     $$\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k y_k$$
     $$P_{k|k} = (I - K_k H) P_{k|k-1}$$
   - If $D_M \ge 3.0$, the GNSS fix is spoofed. We reject $z_k$, set $K_k = 0$, and rely solely on IMU strapdown dead-reckoning:
     $$\hat{x}_{k|k} = \hat{x}_{k|k-1}$$
     $$P_{k|k} = P_{k|k-1}$$

---

### Q5: How does Multi-Antenna Angle of Arrival (DoA) detect spoofing?
**Answer:**  
In true multi-constellation satellite navigation, satellites are dispersed across the celestial hemisphere. The receiver observes signals arriving from diverse azimuth angles $\theta_i \in [0, 2\pi)$ and elevation angles $\phi_i \in (0, \pi/2)$. The angular variance $Var(\theta) > 1.2 \text{ rad}^2$.

A ground-based or drone-based spoofer uses a single transmitter antenna. Even if it synthesizes signals for 12 satellites, **all 12 carrier wavefronts impinge upon the antenna array from the exact same incident direction $(\theta_{sproof}, \phi_{sproof})$**.  
Using a dual-antenna baseline of distance $d$, the phase difference is:
$$\Delta\Phi_i = \frac{2\pi d}{\lambda} \cos(\phi_i)\cos(\theta_i - \beta)$$
When a single spoofer broadcasts, $\Delta\Phi_i$ becomes virtually identical for all PRNs. Our spatial collapse detector monitors the standard deviation of apparent incident azimuths:
$$\sigma_{azimuth} = \sqrt{\frac{1}{N}\sum_{i=1}^N (\theta_i - \bar{\theta})^2}$$
If $\sigma_{azimuth} < 0.15\text{ rad}$ ($8.6^\circ$), it triggers a Layer 2 spatial collapse alarm.

---

### Q6: How does Galileo OS-NMA prevent spoofing, and what are its limitations?
**Answer:**  
Galileo Open Service Navigation Message Authentication (OS-NMA) uses a delayed-key asymmetric cryptographic protocol called **TESLA (Timed Efficient Stream Loss-Tolerant Authentication)**.
1. The satellite transmits navigation data ($M_k$) and a Message Authentication Code ($MAC_k = \text{HMAC}(K_k, M_k)$).
2. The secret key $K_k$ is NOT sent immediately; it is transmitted after a fixed delay $\Delta t_{delay}$ (e.g., 30 seconds).
3. The receiver verifies that $K_k$ belongs to a cryptographically secure hash chain:
   $$K_{root} = h(h(...h(K_k)))$$
4. Once verified, the receiver computes $\text{HMAC}(K_k, M_k)$ and checks equality with $MAC_k$.

**Limitations:**  
- **Delay Buffer:** Because the key arrives with a 30-second delay, the receiver cannot authenticate in zero-latency real-time.
- **Meaconing Vulnerability:** OS-NMA cannot prevent a physical record-and-replay (meaconing) attack, because the spoofer replays the authentic, correctly signed bits. Only Layer 1 (SQM) and Layer 4 (EKF) can detect meaconing.

---

### Q7: Describe your Machine Learning model architecture and why you used an ensemble.
**Answer:**  
We evaluated single models (Decision Trees, SVM, simple MLP) and found that individual models either overfit to specific attack patterns or exhibited high false alarm rates under noisy multipath.  
We engineered a **Soft-Voting Heterogeneous Ensemble** combining:
1. **Random Forest (100 estimators):** Non-parametric partitioning resilient to individual sensor outliers.
2. **HistGradientBoosting (max 100 iterations, lr=0.1):** High-efficiency boosting on continuous feature distributions.
3. **Multi-Layer Perceptron (64-32 hidden units, ReLU, Adam):** Deep non-linear representation of cross-feature interactions.

Each model outputs probability distributions $P(y = c | x)$. The ensemble computes:
$$P_{ensemble}(c) = \frac{1}{3}\left(P_{RF}(c) + P_{HGB}(c) + P_{MLP}(c)\right)$$
On our 7,000-sample dataset representing 7 classes (Authentic + 6 attack variants), this ensemble achieved:
- **Accuracy:** 98.8%
- **ROC-AUC (macro):** 0.999
- **False Alarm Rate on Authentic Signals:** $<0.8\%$
- **Inference Latency:** $<1.5$ ms per epoch, enabling real-time edge execution.

---

### Q8: What are the 14 telemetry features fed into your ML classifier?
**Answer:**  
1. `sqm_ratio_metric`: Correlator ratio $(P_E + P_L)/(2P_P)$.
2. `sqm_delta_asymmetry`: Correlator delta asymmetry $(P_E - P_L)/P_P$.
3. `cn0_variance`: Variance of Carrier-to-Noise density ratio across tracked channels.
4. `cn0_mean`: Average $C/N_0$ (spoofers typically transmit with excessive power $>48$ dB-Hz).
5. `doppler_drift_rate`: Derivative of Doppler shift ($\text{Hz/s}$). High drift signals synthetic slewing.
6. `pseudorange_accel`: Second derivative of pseudorange ($\text{m/s}^2$).
7. `clock_bias`: Receiver clock offset from GPS system time ($c\cdot\delta t$ in meters).
8. `clock_drift`: Receiver clock frequency offset ($\text{m/s}$). Spoofers often introduce nanosecond clock steps.
9. `carrier_phase_residual`: Residual from carrier phase tracking loop (meters).
10. `doa_azimuth_std`: Standard deviation of satellite incident azimuths (radians).
11. `osnma_authenticated`: Boolean flag indicating cryptographic signature validity.
12. `raim_chi2_statistic`: Sum of squared pseudorange residuals ($SSE$).
13. `ekf_innovation_norm`: Norm of measurement innovation vector $||y_k||$.
14. `agc_attenuation_db`: Automatic Gain Control attenuation. High RF power forces AGC attenuation upward.

---

### Q9: What is the TEXBAT dataset, and how did you model its attacks?
**Answer:**  
The **Texas Spoofing Test Battery (TEXBAT)**, created by the Radionavigation Laboratory at the University of Texas at Austin (Humphreys, Psiaki et al., 2012), is the global benchmark for GNSS spoofing evaluation:
- **ds1:** Clean authentic static baseline.
- **ds2:** Matched-power static spoofing with false carrier.
- **ds3:** Matched-power code drag-off ($1.3$ chips slewed over time).
- **ds4:** Matched-power code and carrier drag-off (phase-locked).
- **ds5:** Power-matched dynamic spoofing against a moving receiver.
- **ds6:** High-power dynamic spoofing.
- **ds7:** Asymmetric code drag-off with multipath-like distortion.
- **ds8:** Adversarial noise-injected spoofing.

Our physics engine mathematically synthesizes these precise phenomena by generating 41-tap cross-correlation vectors, Doppler phase slewing rates, and power increments identical to TEXBAT signatures.

---

### Q9b: How did you train your classifier on real-world Hugging Face datasets, and what results did you achieve?
**Answer:**  
In Phase 7, we integrated the Hugging Face `datasets` library (`backend/ml_pipeline/hf_loader.py`) to pull 14,850 real-world multi-constellation interference records from `Omrilevi123/gnss-jamming-spoofing-detection` (balanced across Authentic, Spoofing, and Jamming).  
We aligned 13 core physical features:
- $C/N_0$ statistical profile (`cn0_mean`, `cn0_std`, `cn0_min`, `cn0_max`)
- Intersatellite correlator spread (`const_cn0_spread`, `cn0_elev_corr`)
- Automatic Gain Control RF power (`agc_db`)
- Pseudorange / position jump residual (`position_jump`)
- Multi-antenna Angle of Arrival spatial metrics (`bearing_confidence`, `est_source_azimuth`, `est_source_elevation`)

Using `backend/ml_pipeline/train_classifier.py`, we trained a soft-voting ensemble of a **Random Forest (100 Trees)** and a **HistGradientBoosting Classifier (100 Iterations)**.
On the stratified 20% test holdout (2,970 samples), the model achieved:
- **Accuracy:** `99.93%`
- **Macro Precision:** `99.93%`
- **Macro Recall:** `99.93%`
- **Macro F1-Score:** `99.93%`
- **False Alarm Rate (FAR):** `0.00%` on authentic signals!
- **Top Predictive Features:** `position_jump` (38.73% Gini importance) and `agc_db` (35.65% Gini importance).
The trained model artifact is exported as `backend/models/gnss_spoof_detector.pkl` and automatically loaded by the FastAPI backend on startup with live inference via `/api/ml/predict-hf`.

---

### Q10: What happened in the real-world Baltic Sea incident, and how does AEGIS-GIS detect it?
**Answer:**  
As documented by C4ADS and maritime intelligence reports (2019-2024), merchant vessels navigating legitimate shipping lanes in the Baltic Sea near Kaliningrad reported their AIS (Automatic Identification System) beacons suddenly plotting their position inland at Chkalovsk Military Naval Airfield, $>14$ km away. The spoofer transmitted coordinated constellation ephemeris to force automated ship systems to panic or ground.

**AEGIS-GIS Detection:**
1. **Layer 1 & 2:** High $C/N_0$ and azimuth collapse detect RF anomaly.
2. **Layer 4 (EKF):** The sudden position step of $14,000$ m yields an innovation $D_M \gg 3.0$. The EKF isolates the GPS fix and dead-reckons using vessel heading and speed.
3. **Section 8 GIS Topology:** Our Shapely engine tests `vessel_point.within(baltic_waterway_corridor)`. The spoofed fix intersects an aerodrome runway polygon. Downstream GIS instantly flags `IMPOSSIBLE_LAND_TRANSIT` with severity `CRITICAL`.

---

### Q11: Explain the Section 8.4 Integrity-Aware GeoJSON Schema.
**Answer:**  
Standard GeoJSON only contains `geometry` (coordinates) and arbitrary `properties`. Our Section 8.4 schema standardizes 12 mandatory cyber-physical fields:
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [20.451, 54.712, 12.4] },
  "properties": {
    "epoch_id": 35,
    "timestamp_utc": "2026-10-21T00:00:35Z",
    "consensus_integrity_status": "SPOOFED_CRITICAL",
    "spoofing_probability": 0.992,
    "attack_classification": "COORDINATED_CONSTELLATION",
    "raw_gnss_coordinates": [20.451, 54.712, 12.4],
    "ekf_reconstructed_coordinates": [19.912, 54.708, 0.0],
    "protection_error_ellipse": { "semi_major_m": 8.4, "semi_minor_m": 4.1, "orientation_deg": 112.5 },
    "layer_alert_mask": { "L1_SQM": true, "L2_DOA": true, "L3_OSNMA": false, "L4_EKF": true, "L5_ML": true },
    "gis_topology_violation": "IMPOSSIBLE_LAND_TRANSIT",
    "recommended_mitigation": "ISOLATE_GNSS_RELY_ON_INS_DEAD_RECKONING",
    "downstream_impact_assessment": "Autopilot grounding hazard prevented. Navigation integrity degraded to dead-reckoning."
  }
}
```

---

### Q12: How does the PyQGIS exporter automate visualization in desktop QGIS?
**Answer:**  
In Phase 3, we implemented `backend/gis/pyqgis_exporter.py`. It outputs:
1. `aegis_integrity_features.geojson`: Point features for each epoch with Section 8.4 schema properties.
2. `aegis_trajectories.geojson`: Three distinct LineStrings (`Ground_Truth`, `Raw_Spoofed_GNSS`, `AEGIS_EKF_Corrected`).
3. `aegis_integrity_style.qml`: An XML styling sheet applying categorized rule-based rendering:
   - `AUTHENTIC`: `#00E5FF` (cyan / green, size 3.0)
   - `SUSPECT`: `#FFB300` (amber warning, size 3.5)
   - `SPOOFED_CRITICAL`: `#FF1744` (bright red pulsing marker, size 4.5)
4. `load_into_qgis.py`: A Python script that can be pasted into QGIS's Python Console (`Ctrl+Alt+P`), automatically adding layers, setting CRS to EPSG:4326, and applying the QML styling.

---

### Q13: What is the purpose of Qdrant Vector DB in your architecture?
**Answer:**  
GNSS spoofing forensics requires cross-referencing live telemetry with academic literature and historical threat signatures.
We initialized Qdrant in two distinct collections:
1. `research_paper_knowledge`: 18 chunks of our research paper (Sections 1-10) with dense 128-dimensional normalized TF-IDF semantic embeddings.
2. `texbat_threat_signatures`: 350 reference vectors from the 7 attack classes. When a live attack occurs, we perform a cosine similarity search:
   $$\text{Sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$
   This allows our Copilot to retrieve matching defense papers and provide evidence-backed mitigation advice.

---

### Q14: How does your Local Qwen-4B LLM Agent operate without Internet connectivity?
**Answer:**  
For defense, aviation, and tactical maritime deployments, cloud connectivity cannot be assumed.
We implemented a **3-tier hybrid resilience architecture**:
- **Tier 1 (Local Edge AI):** Connects to local Ollama running on `localhost:11434` with model `qwen2.5:3b`. Generates structured forensic summaries in under 3 seconds on local CPU/GPU.
- **Tier 2 (Cloud LLM Fallback):** If Ollama is offline and `GEMINI_API_KEY` is present, queries `gemini-2.5-flash`.
- **Tier 3 (Deterministic Engine):** If both are unreachable, uses a rule-based expert synthesizer that formats exact mathematical findings and citations directly from the local research paper chunks.
The system is **100% crash-proof** and never fails to respond.

---

### Q15: Why did you choose an Extended Kalman Filter (EKF) instead of an Unscented Kalman Filter (UKF) or Particle Filter?
**Answer:**  
1. **Computational Complexity:** In high-rate GNSS/INS systems running at 10 to 50 Hz on embedded edge hardware, an EKF requires $O(n^3)$ matrix operations for an 8-state vector. A UKF requires $2n+1$ sigma points (17 points), increasing matrix evaluations by over $5\times$. A Particle Filter requires hundreds of particles ($O(N \cdot n^2)$), which is prohibitive for edge microcontrollers.
2. **Mild Non-Linearity:** The INS mechanization and GNSS pseudorange equations are weakly non-linear near the operating trajectory. The first-order Taylor expansion utilized in the EKF Jacobian matrices:
   $$H = \left.\frac{\partial h(x)}{\partial x}\right|_{\hat{x}}$$
   provides near-optimal state estimation without the computational penalty of sigma-point propagation.

---

### Q16: How do you handle cross-track error (XTE) in the Precision Agriculture scenario?
**Answer:**  
In precision agriculture (Scenario 4 in Nashik vineyard/sugarcane rows), autonomous tractors rely on RTK GNSS for sub-inch guidance ($<2.5$ cm).
If a spoofer injects a gradual drift (e.g., $10$ cm/min), traditional threshold detectors do not trip.
Our spatial checker defines row path vectors $AB$. For any fix $P$, the cross-track error is:
$$\text{XTE} = \frac{|(P_x - A_x)(B_y - A_y) - (P_y - A_y)(B_x - A_x)|}{\sqrt{(B_x - A_x)^2 + (B_y - A_y)^2}}$$
When $\text{XTE} > 0.25$ m while wheel-speed odometry indicates zero steering deflection, the system flags `ROW_BOUNDARY_BREACH`, overrides GNSS, and stops the tractor to prevent crop destruction.

---

### Q17: What is the significance of the 41-tap correlator resolution?
**Answer:**  
Commercial GPS receivers often measure only 3 taps: Early, Prompt, and Late with spacing $\Delta = 0.5$ or $1.0$ chips.
A 3-tap correlator can easily be fooled by an adversary who centers their spoofing peak precisely between Early and Late.
By measuring **41 delay taps** sampled from $\tau = -2.0$ to $+2.0$ chips in increments of $0.1$ chips ($100$ ns steps), AEGIS reconstructs the **full cross-correlation envelope**. This reveals:
- Multipath notches
- Asymmetric skirt slope divergence
- Dual-peak energy distribution
This provides rich spatial-temporal features for our ML classifier.

---

### Q18: What is the difference between Spoofing and Jamming?
**Answer:**  
- **Jamming** is brute-force Denial of Service (DoS). The attacker broadcasts high-power wideband Gaussian noise or chirp signals on $1575.42$ MHz. The receiver's $C/N_0$ drops below the tracking threshold ($<28$ dB-Hz), and tracking is lost. The receiver immediately *knows* it is under attack and can raise an alarm.
- **Spoofing** is deceptive and stealthy. The attacker generates valid-looking PRN codes, ephemeris, and Doppler. The receiver continues to calculate a fix, but the fix is controlled by the attacker. **Spoofing is vastly more dangerous because the victim does not know they are being deceived.**

---

### Q19: How did you test and verify the entire system?
**Answer:**  
We adhered to rigorous Test-Driven Development (TDD) across all 5 phases:
- `test_phase1_physics.py` (19 tests): Geodesy math, WGS-84/ECEF round-trip errors $<10^{-4}$ m, UTM projections, correlator envelope symmetry, 4 scenario trajectories.
- `test_phase2_defense_ml.py` (7 tests): SQM metric anomalies, DoA azimuth collapse, OS-NMA TESLA verification, EKF innovation rejection, ML ensemble $>96\%$ accuracy.
- `test_phase3_gis_pipeline.py` (7 tests): Shapely polygon topology checks, Section 8.4 schema validation, GeoJSON generation, PyQGIS script syntax.
- `test_phase4_api.py` (7 tests): Qdrant vector retrieval, hybrid LLM agent fallback, FastAPI endpoints, WebSocket streaming.
- **Total:** 40 unit and integration tests, all passing with zero errors.

---

### Q20: What are the primary future enhancements for AEGIS-GIS?
**Answer:**  
1. **LEO Satellite Mega-Constellations:** Integrating signals of opportunity (SoOP) from Starlink and OneWeb (500-1200 km orbits) which have $30\times$ higher received power and rapid Doppler shifts, making them nearly impossible to spoof from the ground.
2. **Hardware-in-the-Loop (HIL) SDR Testing:** Interfacing AEGIS-GIS directly with a HackRF One / USRP B210 running `gps-sdr-sim` inside an RF-shielded anechoic chamber.
3. **Open Geospatial Consortium (OGC) Standardization:** Submitting our Section 8.4 schema as a formal OGC Community Standard for Position Integrity Metadata.

---

## 5. Emergency Demo Troubleshooting & Cheat Sheet

| Symptom | Cause | One-Line Fix |
|---|---|---|
| Port 8000 already in use | Previous backend instance running | Open PowerShell: `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force` |
| Ollama not responding | Ollama daemon stopped | Open terminal: `ollama run qwen2.5:3b` (or app automatically falls back to Gemini / deterministic synthesizer) |
| Supabase Auth Prompt | Login required | Click the green **"Launch KJSCE Professor / Evaluator Demo Mode"** button for instant 1-click bypass |
| Map tiles loading slowly | Slow campus Wi-Fi | Leaflet uses OpenStreetMap tiles; app caches tiles locally in browser. Trajectory lines render instantly regardless of tiles |
| Python environment issues | Path mismatch | Run `.\venv\Scripts\activate` then `uvicorn backend.main:app --host 0.0.0.0 --port 8000` |

---
*AEGIS-GIS is dedicated to advancing cyber-resilient geospatial infrastructure. Prepared with pride by Batch B2, K.J. Somaiya College of Engineering.*
