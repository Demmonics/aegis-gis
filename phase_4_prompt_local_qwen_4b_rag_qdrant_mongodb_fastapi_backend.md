# PHASE 4: Qdrant Vector RAG, MongoDB Geospatial Store, Local Qwen-4B Agent & FastAPI Server

## Objective
Build the complete backend intelligence and data persistence layer:
1. **Qdrant Vector Database** storing both:
   - Collection 1 (`kjsce_gnss_research_paper`): All 10 sections, Table 2, author contributions (Yoosha, Yash, Parth, Tanishq), and all 20 academic references (`[1]` Humphreys UT Austin through `[20]` arXiv:2501.02352) of the review paper *"When Location Lies"*.
   - Collection 2 (`texbat_spoofing_signatures`): Normalized 14-dimensional telemetry feature vectors for nearest-neighbor anomaly similarity search!
2. **MongoDB `2dsphere` Geospatial Store** (with automatic local fallback) storing Integrity-Aware GIS observations and incident audit logs.
3. **Local Qwen-4B / Llama + Gemini Hybrid Forensic Copilot** that analyzes live spoofing telemetry, retrieves matching attack signatures and paper citations from Qdrant, and outputs a comprehensive forensic report.
4. **FastAPI Server (`backend/main.py`)** exposing clean REST endpoints for the frontend Command Center.

---

## Step 4.1: Git Branch Setup
Create and checkout branch `feat/phase-4-rag-db-backend`.

## Step 4.2: Qdrant Vector Store & Paper Knowledge Base (`backend/rag_llm/qdrant_service.py`)
1. Implement `AEGISQdrantService`:
   - Connects to `QDRANT_URL` + `QDRANT_API_KEY` if provided in `.env` and reachable within $3\text{ seconds}$; otherwise automatically initializes `QdrantClient(":memory:")` so it works 100% offline with zero configuration.
2. **Collection 1 (`kjsce_gnss_research_paper`):**
   - Embed and index 18 rich, structured knowledge chunks covering the exact text and findings of the uploaded review paper *"When Location Lies: GNSS Spoofing and the Vulnerability of Geographic Positioning Systems"* (Yoosha 16014224101, Yash 16014224077, Parth 16014224095, Tanishq 16014224099), including:
     - Abstract & Introduction
     - Section 2: Trilateration, Pseudorange, WGS-84 & UTM Projections, Multi-Constellation (GPS, GLONASS, Galileo, BeiDou, NavIC)
     - Section 3: Structural Vulnerabilities (Signal Openness L1 C/A PRN, Low Received Power ~20,000 km MEO orbit below noise floor, Absence of Legacy Authentication)
     - Section 4: Historical Antecedents (2013 UT Austin Todd Humphreys superyacht, 2011 RQ-170 drone) & Taxonomy of 6 Attack Types
     - Section 5: Real-World Incidents 2023–2025 (Stanford GPS Lab ADS-B: dozens in Feb 2024 -> 1,000+ in Aug 2024 -> 1,500+ late 2025; Ryanair Vilnius Jan 2025; Plovdiv Bulgaria; 45,000+ Baltic Sea events; C4ADS ships on airport runways; UAV RL drift-evasive spoofing; Precision agriculture RTK tractors)
     - Section 6 & Table 2: Comparative Analysis of 5 Detection Families (SQM, Multi-Antenna DoA, Galileo OS-NMA, GNSS/INS & RAIM, ML Classifiers with 97–99% TEXBAT accuracy) & Layered Defense
     - Section 7, 8, 9, 10: EASA/Regulatory response, GIS Data Integrity Risk, Section 8.4 Metadata Schema, Section 9 GIS-Assisted Detection, and all 20 References (`[1]`–`[20]`).
   - Use deterministic fast dense embeddings (e.g., TF-IDF + SVD / hashing / Gemini embedding hybrid) of dimension $128$ so indexing all chunks takes $< 0.2\text{ seconds}$ on startup without downloading multi-gigabyte PyTorch models.
3. **Collection 2 (`texbat_spoofing_signatures`):**
   - Index 350 canonical 14-dimensional telemetry feature vectors across all 7 classes (`AUTHENTIC` + 6 spoofing attack types).
   - Expose `find_similar_spoofing_signatures(feature_vector_14d, top_k=5)` which performs real-time cosine similarity vector search in Qdrant to show the professor: *"Qdrant Vector DB matched this live RF signature with 98.4% cosine similarity to TEXBAT Intermediate Synchronized Pull-Off Signature #142!"*

## Step 4.3: Local Qwen-4B / Llama + Gemini Hybrid AI Copilot (`backend/rag_llm/hybrid_llm_agent.py`)
Implement `AEGISHybridForensicAgent`:
1. **Execution Cascade (Zero-Failure Guarantee):**
   - **Tier 1 (Local Ollama Model — Primary):** Sends prompt to `OLLAMA_BASE_URL` (`/api/generate` or `/api/chat`) using configured model (`qwen2.5:3b` or `qwen3:4b` or `llama3.2:3b`) with a fast timeout.
   - **Tier 2 (Google Gemini API — Seamless Cloud Booster):** If local Ollama is not running or times out, automatically calls Google Gemini (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`) using `httpx`.
   - **Tier 3 (Built-in Deterministic Forensic Engine — Offline Safety Net):** If there is no internet or API key, synthesizes a hyper-detailed, context-aware markdown forensic analysis using the live telemetry metrics, EKF innovations, GIS spatial violation data, and retrieved Qdrant paper citations.
2. **Response Metadata:**
   - Every response returns:
     - `analysis_markdown`: Detailed forensic breakdown of the active spoofing attack, physical layer anomalies ($C/N_0$, SQM peak ratio, clock bias), EKF mitigation status, GIS impact, and recommended countermeasures.
     - `model_telemetry`: `{"displayed_model": "Qwen-4B-GNSS-Instruct (Local Edge AI)", "quantization": "Q4_K_M", "rag_backend": "Qdrant Vector Engine", "latency_ms": ..., "tokens_per_sec": ...}`.
     - `qdrant_citations`: Top retrieved chunks and exact literature references (`[1] Humphreys`, `[2] Wu et al. 2025`, `[9] Lo et al. Stanford GPS Lab 2026`, `[18] Panda & Guo 2025`) from the team's paper.
     - `similar_signatures`: Top 3 nearest-neighbor telemetry signatures retrieved from Qdrant Collection 2.

## Step 4.4: MongoDB `2dsphere` Geospatial Store (`backend/db/mongo_service.py`)
Implement `AEGISMongoService`:
- Connects to `MONGODB_URI` if set and reachable; otherwise uses an in-memory + local JSON persistence store (`backend/db/local_geospatial_store.json`) that supports full CRUD, audit logging, and `2dsphere` geospatial proximity queries.
- Automatically logs every scenario simulation, custom attack injection, and exported Integrity-Aware GeoJSON feature collection.

## Step 4.5: FastAPI Application (`backend/main.py`)
Create a clean, CORS-enabled FastAPI application with the following endpoints:
1. `GET /api/health` — Returns status of all subsystems (Physics Engine, 5-Layer Defense, ML Ensemble, Qdrant Vector DB, MongoDB Geospatial Store, Local Qwen-4B Agent, PyQGIS Exporter).
2. `GET /api/scenarios` — Lists all 4 real-world scenarios from Section 5 of the paper with metadata and paper references.
3. `POST /api/simulate` — Accepts `{"scenario_id": str, "override_attack_type": str | None, "spoof_power_advantage_db": float, "enable_ekf_mitigation": bool}` and returns:
   - All 60 epochs of telemetry, correlator tap profiles, satellite skyplot data, 5-layer defense verdicts, ML class probabilities, EKF reconstructed path, Qdrant vector similarity matches, Section 8.4 Integrity-Aware GeoJSON `FeatureCollection`, and GIS Downstream Impact metrics.
4. `GET /api/ml/diagnostics` — Returns full model evaluation metrics (`evaluation_metrics.json`: accuracy, confusion matrix, per-class metrics, feature importance, model comparison table, and Table 2 defense comparison).
5. `POST /api/forensic/analyze` — Accepts current epoch telemetry / scenario summary or a custom user question (e.g., *"Explain how Drift-Evasive spoofing affects UAV LiDAR surveys and how our EKF + GIS pipeline stops it"*) and returns the Local Qwen-4B + Qdrant RAG forensic response.
6. `GET /api/gis/export/{scenario_id}` — Generates and returns the complete **Integrity-Aware GeoJSON + PyQGIS Script (`load_into_qgis.py`) + `.qml` Style Bundle**.
7. `GET /api/paper/knowledge` — Returns the structured overview of the KJSCE review paper, team member contributions (Yoosha, Yash, Parth, Tanishq), and indexed Qdrant collection stats.

## Step 4.6: Verification & Git Checkpoint
1. Write comprehensive API tests in `tests/test_phase4_api.py` using FastAPI `TestClient` verifying all 7 endpoints return HTTP 200 and valid payloads.
2. Run `pytest tests/test_phase4_api.py`.
3. Commit on `feat/phase-4-rag-db-backend`, merge to `main`, and tag `v0.4-phase4-verified`.