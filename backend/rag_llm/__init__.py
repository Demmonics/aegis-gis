"""
AEGIS-GIS RAG & LLM Engine
Qdrant Vector Database service and Local Qwen-4B / Gemini Hybrid Forensic Copilot.
"""

from .qdrant_service import (
    AEGISQdrantService,
    PAPER_CHUNKS,
)
from .hybrid_llm_agent import (
    AEGISHybridForensicAgent,
)

__all__ = [
    "AEGISQdrantService",
    "PAPER_CHUNKS",
    "AEGISHybridForensicAgent",
]
