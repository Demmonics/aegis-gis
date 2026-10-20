"""
AEGIS-GIS: FastAPI Async Server & API Gateway
Department of AI & DS, K.J. Somaiya College of Engineering
Authors: Yoosha (16014224101), Yash (16014224077), Parth (16014224095), Tanishq (16014224099)
"""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from .config import settings
from .physics.signal_simulator import SpoofingAttackType
from .physics.scenarios import (
    get_all_scenarios,
    run_scenario,
    SCENARIO_METADATA_REGISTRY,
)
from .defense.layered_pipeline import LayeredDefenseCoordinator
from .defense.ml_classifier import AEGISMultiClassSpoofingClassifier
from .gis.integrity_schema import IntegrityAwareGISBuilder
from .gis.pyqgis_exporter import export_qgis_bundle
from .rag_llm.qdrant_service import AEGISQdrantService, PAPER_CHUNKS
from .rag_llm.hybrid_llm_agent import AEGISHybridForensicAgent
from .db.mongo_service import AEGISMongoService

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Multi-Layered GNSS Spoofing Detection, EKF Sensor Fusion & Integrity-Aware GIS Pipeline",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Middleware allowing Vite dev server and production clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize core services
qdrant_service = AEGISQdrantService()
mongo_service = AEGISMongoService()
ml_classifier = AEGISMultiClassSpoofingClassifier()
forensic_agent = AEGISHybridForensicAgent(qdrant_service=qdrant_service)
layered_coordinator = LayeredDefenseCoordinator(classifier=ml_classifier)
gis_builder = IntegrityAwareGISBuilder()


# Request Models
class SimulateRequest(BaseModel):
    scenario_id: str = Field(default="baltic_maritime_c4ads")
    override_attack_type: Optional[str] = Field(default=None)
    spoof_power_advantage_db: float = Field(default=3.0, ge=0.0, le=15.0)
    enable_ekf_mitigation: bool = Field(default=True)
    total_epochs: int = Field(default=60, ge=10, le=120)


class ForensicAnalyzeRequest(BaseModel):
    scenario_title: str = Field(default="Active GNSS Incident")
    attack_type: str = Field(default="INTERMEDIATE_SYNC")
    query: Optional[str] = Field(default=None)
    telemetry_features: Optional[Dict[str, Any]] = Field(default=None)
    feature_vector_14d: Optional[List[float]] = Field(default=None)


# 1. Health & Status
@app.get("/api/health")
async def get_health_status():
    db_stats = mongo_service.get_db_status()
    qdrant_stats = qdrant_service.get_collection_stats()

    return {
        "status": "HEALTHY",
        "project": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "college": settings.COLLEGE,
        "department": settings.DEPARTMENT,
        "authors": [
            {"name": "Yoosha", "roll": "16014224101", "role": "GNSS Architecture & Structural Vulnerability"},
            {"name": "Yash", "roll": "16014224077", "role": "6-Attack Taxonomy & RF Signal Simulator"},
            {"name": "Parth", "roll": "16014224095", "role": "Real-World Case Studies (Aviation, Maritime, UAV, Ag)"},
            {"name": "Tanishq", "roll": "16014224099", "role": "5-Layer Defense Engine, ML Ensemble & GIS Schema"}
        ],
        "services": {
            "physics_engine": "ACTIVE",
            "5_layer_defense": "ACTIVE",
            "ml_classifier_ensemble": {
                "status": "ONLINE",
                "accuracy": ml_classifier.evaluation_metrics.get("overall_accuracy", 0.988),
                "classes": 7
            },
            "qdrant_vector_store": qdrant_stats,
            "geospatial_database": db_stats,
            "hybrid_ai_copilot": {
                "primary": settings.DISPLAY_MODEL_NAME,
                "local_ollama_url": settings.OLLAMA_BASE_URL,
                "model_name": settings.LOCAL_LLM_MODEL
            },
            "pyqgis_exporter": "ACTIVE"
        }
    }


# 2. Scenarios List
@app.get("/api/scenarios")
async def list_scenarios():
    scenarios = get_all_scenarios()
    return {
        "total_scenarios": len(scenarios),
        "scenarios": [s.model_dump() for s in scenarios]
    }


# 3. Simulation & Defense Pipeline
@app.post("/api/simulate")
async def simulate_scenario(req: SimulateRequest):
    if req.scenario_id not in SCENARIO_METADATA_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Scenario '{req.scenario_id}' not found.")

    attack_override = None
    if req.override_attack_type:
        try:
            attack_override = SpoofingAttackType(req.override_attack_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid attack type: {req.override_attack_type}")

    # Generate physics simulation run
    run = run_scenario(
        scenario_id=req.scenario_id,
        total_epochs=req.total_epochs,
        override_attack_type=attack_override,
        spoofer_power_advantage_db=req.spoof_power_advantage_db,
        enable_ekf_mitigation=req.enable_ekf_mitigation
    )

    # Process through 5-layer defense coordinator
    layered_records = layered_coordinator.process_scenario_stream(run.telemetry)

    # Build Section 8.4 Integrity GeoJSON and Downstream Impact report
    geojson_collection = gis_builder.build_geojson_collection(run, layered_records=layered_records)
    impact_report = gis_builder.generate_downstream_impact_report(run, layered_records=layered_records)

    # Log to MongoDB/Local store
    mongo_service.save_simulation_run(req.scenario_id, run.model_dump())
    mongo_service.log_audit_event("SCENARIO_SIMULATION_EXECUTED", {
        "scenario_id": req.scenario_id,
        "attack_type": attack_override.value if attack_override else run.metadata.default_attack_type.value,
        "total_epochs": req.total_epochs,
        "rmse_legacy": impact_report.legacy_unprotected_pipeline["positional_rmse_meters"],
        "rmse_aegis": impact_report.aegis_integrity_aware_pipeline["positional_rmse_meters"]
    })

    # Prepare response payload
    return {
        "scenario_metadata": run.metadata.model_dump(),
        "total_epochs": run.total_epochs,
        "ground_truth_path": run.ground_truth_path,
        "reported_spoofed_path": run.reported_spoofed_path,
        "ekf_recovered_path": run.ekf_recovered_path,
        "telemetry_epochs": [t.model_dump() for t in run.telemetry],
        "layered_defense_records": [r.model_dump() for r in layered_records],
        "gis_reference_geojson": run.gis_reference_geojson,
        "integrity_aware_geojson": geojson_collection,
        "downstream_impact_assessment": impact_report.model_dump()
    }


# 4. ML Diagnostics & Table 2 Benchmark
@app.get("/api/ml/diagnostics")
async def get_ml_diagnostics():
    metrics = ml_classifier.evaluation_metrics
    table_2_comparison = [
        {
            "family": "Layer 1: Signal Quality Monitoring (SQM)",
            "section": "Section 6.1",
            "hardware_cost": "Low (single antenna)",
            "detection_latency": "< 1 ms",
            "primary_strength": "Catches non-synchronized power surges & peak asymmetry",
            "key_limitation": "Vulnerable to power-matched receiver-aware attacks"
        },
        {
            "family": "Layer 2: Multi-Antenna Direction of Arrival (DoA)",
            "section": "Section 6.2",
            "hardware_cost": "High (antenna array + multi-channel RF)",
            "detection_latency": "< 5 ms",
            "primary_strength": "Identifies single ground transmitter spatial collapse (< 12°)",
            "key_limitation": "Bypassed by multi-transmitter distributed spoofer arrays"
        },
        {
            "family": "Layer 3: Cryptographic Navigation Message Auth (OS-NMA)",
            "section": "Section 6.3",
            "hardware_cost": "Zero (firmware update)",
            "detection_latency": "10 - 30 seconds (subframe delay)",
            "primary_strength": "Cryptographic proof of genuine Galileo navigation bits",
            "key_limitation": "Cannot detect meaconing (record & replay delay)"
        },
        {
            "family": "Layer 4: Tightly-Coupled INS/GNSS EKF & RAIM",
            "section": "Section 6.4 & 6.6",
            "hardware_cost": "Medium (MEMS/tactical IMU)",
            "detection_latency": "< 2 ms",
            "primary_strength": "Restores trusted trajectory during prolonged spoofing outages",
            "key_limitation": "Inertial dead-reckoning drift accumulates over prolonged attacks"
        },
        {
            "family": "Layer 5: Multi-Class ML Ensemble (AEGIS)",
            "section": "Section 6.5",
            "hardware_cost": "Low (software edge inference)",
            "detection_latency": "< 2 ms",
            "primary_strength": "98.8% accuracy on TEXBAT; classifies which attack is occurring",
            "key_limitation": "Requires representative training distribution"
        },
        {
            "family": "Layer 6: GIS-Assisted Spatial Topology Detection",
            "section": "Section 9",
            "hardware_cost": "Zero (integrates GIS vector layers)",
            "detection_latency": "< 1 ms",
            "primary_strength": "Catches spatial absurdity (e.g. ships on airport runways)",
            "key_limitation": "Requires pre-existing GIS parcel/corridor layers"
        }
    ]

    return {
        "evaluation_metrics": metrics,
        "table_2_comparison": table_2_comparison
    }


# 5. Local Qwen-4B / Gemini Hybrid AI Copilot
@app.post("/api/forensic/analyze")
async def analyze_incident_forensics(req: ForensicAnalyzeRequest):
    result = forensic_agent.generate_forensic_report(
        scenario_title=req.scenario_title,
        attack_type=req.attack_type,
        telemetry_features=req.telemetry_features,
        query=req.query,
        feature_vector_14d=req.feature_vector_14d
    )
    return result


# 6. PyQGIS Integration Bundle Exporter
@app.get("/api/gis/export/{scenario_id}")
async def export_qgis(scenario_id: str):
    if scenario_id not in SCENARIO_METADATA_REGISTRY:
        scenario_id = "baltic_maritime_c4ads"

    export_res = export_qgis_bundle(scenario_id=scenario_id)

    # Read contents for direct API inspection
    p_script = Path(export_res["pyqgis_script"])
    p_feat = Path(export_res["points_geojson"])
    p_qml = Path(export_res["qml_style"])

    return {
        "scenario_id": scenario_id,
        "files_generated": export_res,
        "pyqgis_script_content": p_script.read_text(encoding="utf-8") if p_script.exists() else "",
        "qml_style_content": p_qml.read_text(encoding="utf-8") if p_qml.exists() else "",
        "download_instructions": (
            "Run 'load_into_qgis.py' inside the QGIS Python Console to automatically "
            "load all layers, apply rule-based symbology, and zoom to the incident extent."
        )
    }


# 7. KJSCE Review Paper Knowledge Base
@app.get("/api/paper/knowledge")
async def get_paper_knowledge(query: Optional[str] = Query(None)):
    if query:
        matches = qdrant_service.search_paper_knowledge(query, top_k=6)
        return {"query": query, "matches": matches}

    stats = qdrant_service.get_collection_stats()
    return {
        "paper_title": "When Location Lies: GNSS Spoofing and the Vulnerability of Geographic Positioning Systems",
        "institution": "K.J. Somaiya College of Engineering, Vidyavihar, Mumbai",
        "department": "Department of Artificial Intelligence & Data Science",
        "batch": "Batch B2 (Academic Year 2025-2026)",
        "team_members": [
            {
                "name": "Yoosha",
                "roll_number": "16014224101",
                "sections": "Abstract, Introduction, Section 2 (Trilateration & Coordinate Systems), Section 3 (Structural Vulnerabilities)"
            },
            {
                "name": "Yash",
                "roll_number": "16014224077",
                "sections": "Section 4 (Historical Antecedents & Taxonomy of 6 Attack Types)"
            },
            {
                "name": "Parth",
                "roll_number": "16014224095",
                "sections": "Section 5 (Real-World Case Studies 2023-2025: Aviation, Maritime, UAV, Precision Ag)"
            },
            {
                "name": "Tanishq",
                "roll_number": "16014224099",
                "sections": "Section 6 (5-Layer Detection Families & Table 2), Section 8 (Integrity Schema), Section 9 (GIS-Assisted Detection)"
            }
        ],
        "indexed_chunks_count": len(PAPER_CHUNKS),
        "qdrant_stats": stats,
        "sample_chunks": PAPER_CHUNKS[:4]
    }


# Serve built frontend static assets if available
frontend_dist = settings.BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse({"status": "AEGIS-GIS API Server Active. Frontend dist building..."})
