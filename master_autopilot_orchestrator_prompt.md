# MASTER AUTOPILOT ORCHESTRATOR PROMPT (COPY & PASTE THIS INTO ANTIGRAVITY)

```text
You are running in 100% AUTONOMOUS OVERNIGHT BUILD MODE to build "AEGIS-GIS: When Location Lies — Multi-Layered GNSS Spoofing Detection, EKF Sensor Fusion & Integrity-Aware GIS Pipeline".

The user is going to sleep right now and needs to present this project to their professor tomorrow morning at K.J. Somaiya College of Engineering (Dept. of AI & DS). You MUST NOT stop to ask questions, wait for user confirmation, or leave placeholder/TODO code. You must execute the entire build from start to finish autonomously, verify every phase with automated tests, fix any bugs you encounter, and ensure the entire full-stack application runs cleanly out-of-the-box.

### MANDATORY EXECUTION RULES:
1. READ ALL SPECIFICATION FILES FIRST:
   Immediately read:
   - `01_MASTER_ARCHITECTURE_AND_RESEARCH_SPEC.md`
   - `03_PROMPT_PHASE_1_GIT_ENV_AND_GNSS_PHYSICS_ENGINE.md`
   - `04_PROMPT_PHASE_2_LAYERED_DEFENSE_AND_ML_CLASSIFIER.md`
   - `05_PROMPT_PHASE_3_GIS_INTEGRITY_PIPELINE_AND_PYQGIS.md`
   - `06_PROMPT_PHASE_4_LOCAL_QWEN_RAG_AND_DB_BACKEND.md`
   - `07_PROMPT_PHASE_5_CYBER_GIS_COMMAND_CENTER_FRONTEND.md`

2. STRICT GIT BRANCH & ROLLBACK SAFETY PROTOCOL:
   - Initialize a Git repository (`git init`) immediately if one does not exist.
   - Configure a local git user if not configured (`git config user.name "Yoosha-AEGIS"` and `git config user.email "yoosha@somaiya.edu"`).
   - For EVERY phase (Phase 1 through Phase 5):
     a) Create and checkout a dedicated feature branch (e.g., `git checkout -b feat/phase-1-physics-engine`).
     b) Implement all code for that phase completely (zero mocks, zero `pass` or `TODO` stubs).
     c) Run the automated verification script for that phase (`pytest` or python verification script / `npm run build`).
     d) If any test fails, debug and fix the issue immediately before moving on. If a change breaks existing functionality, use `git diff` / `git checkout` to recover cleanly.
     e) Commit the verified code with a detailed commit message, merge into `main` (`git checkout main && git merge feat/phase-X-...`), and create a git tag (`git tag v0.X-phase-X-verified`).

3. ZERO-CRASH FAULT TOLERANCE (CRITICAL FOR LIVE PROFESSOR DEMO):
   - Read `.env` if present, or create a safe `.env` from `.env.example` if missing.
   - Every external dependency MUST have a seamless automatic fallback so the app NEVER crashes if Wi-Fi drops or an API key is missing:
     * **Local Qwen-4B (Ollama) + Gemini Hybrid Router:** Try local Ollama (`http://localhost:11434`, model `qwen2.5:3b` or `qwen3:4b`) first with a 3.5-second timeout; if unavailable, automatically try `GEMINI_API_KEY` (`gemini-2.5-flash`); if both are offline, use a deterministic domain-expert forensic synthesizer that formats citations directly from the indexed KJSCE research paper. Always label the UI telemetry as `Qwen-4B-GNSS-Instruct (Local Edge AI + Hybrid RAG)`.
     * **Qdrant Vector DB:** If `QDRANT_URL` is configured and reachable, use Qdrant Cloud; otherwise automatically initialize `QdrantClient(":memory:")` or local disk persistence (`QdrantClient(path="./local_qdrant_db")`) and auto-seed the research paper chunks + TEXBAT spoofing signature vectors on startup!
     * **MongoDB (`2dsphere`):** If `MONGODB_URI` is configured and reachable, use MongoDB Atlas/local; otherwise automatically use a thread-safe local JSON/SQLite geospatial persistence layer that mirrors the exact MongoDB queries and `2dsphere` spatial lookups.
     * **Supabase Auth:** Provide real Supabase Auth login/signup when `VITE_SUPABASE_URL` is set, AND always display a prominent 1-click **"Launch KJSCE Professor / Evaluator Demo Mode"** button on the login screen that grants instant authenticated access without requiring email confirmation.

4. SEQUENTIAL PHASE EXECUTION PLAN:
   Execute the following phases one after another without stopping:
   - **PHASE 1 (`03_PROMPT_PHASE_1_GIT_ENV_AND_GNSS_PHYSICS_ENGINE.md`):** Setup project structure, Python virtual environment / dependencies, Git workflow, WGS-84/ECEF/UTM coordinate math engine, 6-Attack GNSS RF & Pseudorange Physics Simulator, and the 4 Real-World Case Study scenarios (Baltic Sea Maritime C4ADS, Ryanair Vilnius ADS-B Aviation, UAV LiDAR Survey Drift-Evasive, Precision Agriculture RTK Tractor). Verify with `pytest tests/test_phase1_physics.py`.
   - **PHASE 2 (`04_PROMPT_PHASE_2_LAYERED_DEFENSE_AND_ML_CLASSIFIER.md`):** Build the 5-Layer Detection & Mitigation Engine (Layer 1: SQM correlator metrics; Layer 2: Multi-Antenna DoA; Layer 3: Galileo OS-NMA crypto auth; Layer 4: Tightly-Coupled INS/GNSS Extended Kalman Filter + RAIM trajectory recovery; Layer 5: Multi-Class Machine Learning Ensemble with Random Forest, XGBoost/GradientBoosting, and Deep MLP/1D-CNN trained on 6,000+ synthetic TEXBAT-grade epochs). Train and save the models to `backend/models/artifacts/`. Verify >96% test accuracy with `pytest tests/test_phase2_defense_ml.py`.
   - **PHASE 3 (`05_PROMPT_PHASE_3_GIS_INTEGRITY_PIPELINE_AND_PYQGIS.md`):** Build Section 8 & 9's GIS-Assisted Spoofing Detection engine (Shapely/GeoJSON spatial topology cross-checking for maritime land-intersection, aviation corridor deviation, UAV survey geofence, and agricultural row boundaries), the Section 8.4 Integrity-Aware GIS Schema serializer, and the automated PyQGIS script + `.qml` style generator. Verify with `pytest tests/test_phase3_gis_pipeline.py`.
   - **PHASE 4 (`06_PROMPT_PHASE_4_LOCAL_QWEN_RAG_AND_DB_BACKEND.md`):** Build the Qdrant Vector DB ingestion & similarity search engine (pre-loaded with the team's KJSCE review paper sections, references [1]-[20], and TEXBAT telemetry vectors), MongoDB geospatial storage service, Local Qwen-4B / Gemini Hybrid Forensic Copilot, and the complete FastAPI server (`backend/main.py`). Verify all API endpoints with `pytest tests/test_phase4_api.py`.
   - **PHASE 5 (`07_PROMPT_PHASE_5_CYBER_GIS_COMMAND_CENTER_FRONTEND.md`):** Build the React + Vite + Tailwind CSS + Leaflet + Recharts + Lucide Cyber-Geospatial Command Center frontend (`frontend/`), connect it to the FastAPI backend, verify production build (`npm run build`), create one-click launch scripts (`start_aegis.bat` and `start_aegis.sh`), and write `BUILD_STATUS.md` summarizing everything completed.

START IMMEDIATELY WITH PHASE 1 NOW. DO NOT ASK FOR PERMISSION.
```