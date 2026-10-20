"""
AEGIS-GIS Configuration Management
Pydantic Settings with fault-tolerant local fallbacks.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Project metadata
    PROJECT_NAME: str = "AEGIS-GIS: When Location Lies"
    PROJECT_VERSION: str = "1.0.0"
    COLLEGE: str = "K.J. Somaiya College of Engineering"
    DEPARTMENT: str = "Department of Artificial Intelligence & Data Science"

    # AI & LLM Hybrid Router
    GEMINI_API_KEY: str = Field(default="")
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    LOCAL_LLM_MODEL: str = Field(default="qwen2.5:3b")
    DISPLAY_MODEL_NAME: str = Field(default="Qwen-4B-GNSS-Instruct (Local Edge AI + Hybrid RAG)")
    OLLAMA_TIMEOUT_SECONDS: float = Field(default=3.5)

    # Qdrant Vector Store
    QDRANT_URL: str = Field(default="")
    QDRANT_API_KEY: str = Field(default="")
    QDRANT_COLLECTION: str = Field(default="kjsce_gnss_research_paper")
    QDRANT_TIMEOUT: float = Field(default=5.0)
    USE_LOCAL_QDRANT: bool = Field(default=True)

    # MongoDB 2dsphere Geospatial Store
    MONGODB_URI: str = Field(default="")
    MONGODB_DB_NAME: str = Field(default="aegis_gis_db")
    USE_LOCAL_MONGO_STORE: bool = Field(default=True)

    # Supabase Auth
    VITE_SUPABASE_URL: str = Field(default="")
    VITE_SUPABASE_ANON_KEY: str = Field(default="")
    DEV_AUTH_BYPASS: bool = Field(default=True)

    # Paths
    BASE_DIR: Path = BASE_DIR
    ARTIFACTS_DIR: Path = BASE_DIR / "backend" / "models" / "artifacts"
    QGIS_EXPORT_DIR: Path = BASE_DIR / "qgis_export"

settings = Settings()
