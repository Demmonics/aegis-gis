# PHASE 5: Cyber-Geospatial Tactical Command Center Frontend, Supabase Auth & Final Polish

## Objective
Build a jaw-dropping, defense-grade **Cyber-Geospatial Tactical Command Center** in `frontend/` using **React 18 + Vite + Tailwind CSS + React-Leaflet / Leaflet + Recharts + Lucide Icons**. When the professor sees this screen tomorrow morning, it should look like a $10M Palantir / Anduril / Stanford GPS Lab mission control system built specifically around their KJSCE review paper!

---

## Step 5.1: Git Branch & Frontend Initialization
1. Create and checkout branch `feat/phase-5-command-center-ui`.
2. Initialize the React + Vite project in `frontend/` (using `npm create vite@latest` or writing a clean `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`).
3. Install dependencies:
   ```bash
   cd frontend
   npm install react react-dom lucide-react recharts leaflet react-leaflet @supabase/supabase-js clsx tailwind-merge
   npm install -D @vitejs/plugin-react tailwindcss postcss autoprefixer
   ```
   *(Ensure Leaflet CSS is imported properly in `index.html` or `main.jsx` so map tiles and custom vector layers render flawlessly!)*

## Step 5.2: Aesthetic Direction & Color Palette (Palantir / Defense Avionics Dark UI)
Design a high-contrast, ultra-crisp Dark Mode Tactical HUD (`bg-slate-950 text-slate-100`):
- **Color Coding:**
  - **Verified Ground Truth / Authentic Signal:** Emerald (`#10b981`)
  - **Spoofed Receiver Position / Corrupted GIS Fix:** Crimson Red (`#ef4444`)
  - **AEGIS EKF + GIS Reconstructed Recovery Trajectory:** Electric Cyan (`#06b6d4`)
  - **Early Warning / SQM Distortion:** Amber (`#f59e0b`)
  - **Local Qwen-4B + Qdrant RAG Intelligence:** Violet/Indigo (`#8b5cf6`)
- **Top Header Bar:**
  - Project Emblem & Title: **`AEGIS-GIS // WHEN LOCATION LIES`**
  - Subtitle badge: **`K.J. Somaiya College of Engineering • Dept. of AI & DS • Batch B2 (Yoosha, Yash, Parth, Tanishq)`**
  - Live System Status Pills:
    - `Local Edge AI: Qwen-4B-Instruct (Active)`
    - `Qdrant Vector DB: 2 Collections Indexed`
    - `MongoDB 2dsphere: Connected`
    - `ML Ensemble Accuracy: 98.8%`

## Step 5.3: Supabase Authentication + 1-Click "Professor Evaluator Mode" (`frontend/src/components/AuthGate.jsx`)
1. Build a sleek cyber-security login modal supporting:
   - Real Supabase Email/Password Login & Sign Up (when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured).
   - A large, glowing primary CTA button right at the top: **"Launch KJSCE Professor / Viva Evaluator Mode (1-Click Instant Access)"** so Yoosha can enter the Command Center in 1 second during the presentation without typing passwords!

## Step 5.4: Five Interactive Command Views (Navigation Tabs)

### Tab 1: `TACTICAL GIS & RF COMMAND CENTER` (Main Live Simulation Dashboard)
Split into a responsive multi-panel mission control workspace:
1. **Top Control Bar (Scenario & Live Attack Injector):**
   - **Scenario Selector (Section 5 Real-World Case Studies):**
     - `Baltic Sea Maritime Tanker (C4ADS Airport Runway Spoof - Sec 5.2)`
     - `Ryanair Vilnius ILS Approach (ADS-B Clock Reset - Sec 5.1)`
     - `UAV LiDAR Coastal Survey (RL Drift-Evasive Attack - Sec 5.3)`
     - `Nashik Vineyard RTK Tractor (Autosteer Crop Row Spoof - Sec 5.4)`
   - **Live Attack Override Selector (Section 4.2 Taxonomy):** Let the user dynamically inject any of the 6 spoofing attacks (`SIMPLISTIC_NON_SYNC`, `INTERMEDIATE_SYNC`, `SOPHISTICATED_RECEIVER_AWARE`, `MEACONING`, `NULLING_SUPPRESSION`, `DRIFT_EVASIVE_UAV`, or `AUTHENTIC`) and adjust the **Spoofer Power Advantage Slider ($0\text{ to }+15\text{ dB}$)**.
   - **Playback Timeline Scrubber (Epochs $0 \to 59$):** Play / Pause button + epoch slider so the user can scrub through the exact moment the spoofer locks onto the tracking loop and watch the EKF mitigation kick in!
2. **Center-Left Panel: Interactive Multi-Layer WebGIS Map (`React-Leaflet`):**
   - Dark cartographic basemap (`CartoDB DarkMatter` + toggleable Satellite/OSM layer).
   - Renders:
     - **GIS Reference Polygon / Corridor** (Shipping lane, airport runway, ILS approach funnel, UAV survey grid, or vineyard crop rows).
     - **Green Polyline:** True physical trajectory.
     - **Red Dashed Polyline:** Corrupted GNSS trajectory reported by the spoofed receiver (e.g., ship driving onto the airport runway!).
     - **Cyan Solid Polyline:** **AEGIS EKF + GIS Reconstructed Trajectory** showing real-time recovery!
     - **Interactive Epoch Marker Popup:** Clicking any point on the map opens a popup showing the **Section 8.4 Integrity-Aware GIS Metadata** (`CRS: WGS-84 & UTM`, `PDOP`, `C/N0`, `OS-NMA Auth`, `Attack Class`, `Confidence`, `GIS Topology Check`).
3. **Center-Right Panel: Real-Time RF Correlator Peak & Telemetry Oscilloscopes (`Recharts`):**
   - **Chart 1 — RF Correlator Peak Distortion ($I/Q$ Early-Prompt-Late Triangle):** Plots the 41 correlator delay taps ($-2.0\text{ to }+2.0\text{ chips}$) showing the **Authentic Peak**, the **Spoofer Injected Peak**, and the **Composite Distorted Peak** in real time as the user scrubs through epochs!
   - **Chart 2 — Multi-Parameter Time Series:** Synchronized sparklines for $C/N_0\text{ (dB-Hz)}$, Clock Bias Jump ($m$), RAIM Residual ($\text{RMS}$), and EKF Innovation Mahalanobis Distance ($\gamma_k$).
4. **Bottom Strip: Live 5-Layer Defense Matrix HUD (Table 2 of Paper):**
   - 5 glowing status cards for **L1: SQM**, **L2: Multi-Antenna DoA**, **L3: Galileo OS-NMA**, **L4: INS/GNSS EKF + RAIM**, and **L5: ML Ensemble + GIS Topology**, showing real-time anomaly scores and pass/alert badges.

### Tab 2: `ML CLASSIFIER & TABLE 2 BENCHMARK DIAGNOSTICS`
A dedicated Data Science & AI evaluation view for the professor:
1. **Model Performance KPIs:** Overall Accuracy ($98.8\%$), Macro F1, False Alarm Rate, and Latency ($< 4\text{ ms}$).
2. **Interactive $7 \times 7$ Confusion Matrix Heatmap:** Across `AUTHENTIC` and all 6 Spoofing Attack Classes.
3. **14-Feature Importance Bar Chart:** Highlighting how $C/N_0$ moving variance, SQM ratio metric, clock bias jump, EKF innovation, and CUSUM drift contribute to separating attacks.
4. **Model Architecture Comparison Table:** Comparing Random Forest vs. Gradient Boosting vs. Deep 1D-CNN/MLP + the interactive **Table 2 Technique Family Comparison** from Section 6 of the paper.

### Tab 3: `SECTION 8.4 INTEGRITY-AWARE GIS & PYQGIS EXPORTER`
Demonstrates the GIS core of the project:
1. **Legacy GIS vs. AEGIS Integrity-Aware GIS Comparison:** Shows side-by-side metrics of how a standard GIS pipeline silently ingests corrupted coordinates (corrupting buffer/overlay spatial analyses and LiDAR orthomosaics) vs. how AEGIS quarantines spoofed points and substitutes EKF-validated geometry.
2. **Live Section 8.4 GeoJSON Schema Inspector:** Interactive JSON/table viewer displaying the 12 integrity metadata attributes alongside WGS-84 and projected UTM coordinates.
3. **PyQGIS Code Viewer & 1-Click Bundle Downloader:** Displays the generated `load_into_qgis.py` script with syntax highlighting and buttons to download `.geojson`, `load_into_qgis.py`, and `aegis_integrity_style.qml`.

### Tab 4: `LOCAL QWEN-4B + QDRANT RAG FORENSIC COPILOT`
An interactive AI Forensic Workbench:
1. Shows **Local Qwen-4B Model Telemetry** + **Qdrant Vector Similarity Search Results** (matching the current epoch's 14D vector against indexed TEXBAT attack signatures with cosine similarity scores!).
2. **1-Click Quick Prompts for the Professor Demo:**
   - *"Generate Full Forensic Incident Report for Active Scenario"*
   - *"Explain How Intermediate Synchronized Spoofing Distorts SQM Correlation Peaks (Sec 4.2 & 6.1)"*
   - *"Why Does Legacy RAIM Fail Against Coordinated Spoofing & How Does Our EKF + GIS Layer Fix It?"*
   - *"Evaluate Downstream Impact on UAV LiDAR Orthomosaics & Precision Agriculture (Sec 8.2 & 8.3)"*
3. Displays the AI's structured forensic response alongside **Verified Citations from the KJSCE Review Paper** retrieved from Qdrant.

### Tab 5: `KJSCE RESEARCH PAPER & POSTER ALIGNMENT MATRIX`
A clean presentation guide built right into the app for the viva:
- Displays the 4 team members (**Yoosha 16014224101, Yash 16014224077, Parth 16014224095, Tanishq 16014224099**), their exact paper sections, key statistics from the poster ($1,500+$ flights/day in late 2025, $45,000+$ Baltic Sea events, 6 attack types, 5 detection families), and one-click buttons that jump directly to the live module demonstrating each member's contribution!

## Step 5.5: Launch Scripts, End-to-End Verification & `BUILD_STATUS.md`
1. Run `npm run build` inside `frontend/` to verify zero JSX, import, or CSS compilation errors.
2. Configure FastAPI (`backend/main.py`) so that in addition to serving `/api/*`, it can also serve the built `frontend/dist` static files on `/` if someone visits `http://localhost:8000` directly, while Vite dev server runs on `http://localhost:5173`.
3. Create root startup scripts:
   - `start_aegis.bat` (Windows) and `start_aegis.sh` (Mac/Linux) that start both the FastAPI backend (`port 8000`) and Vite frontend (`port 5173`).
4. Run the full test suite (`pytest`) across all phases to guarantee $100\%$ passing tests.
5. Create `BUILD_STATUS.md` in the root folder documenting all completed features, test results, git tags, and startup instructions.
6. Commit on `feat/phase-5-command-center-ui`, merge to `main`, and tag `v1.0-hackathon-release`.