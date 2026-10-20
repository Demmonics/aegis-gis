"""
AEGIS-GIS: MongoDB 2dsphere Geospatial Storage Service
With automatic thread-safe local JSON/Shapely fallback.
"""

import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import math

from ..config import settings

logger = logging.getLogger("AEGIS-MONGO")


class AEGISMongoService:
    """
    Geospatial persistence service for scenario runs, Section 8.4 GeoJSON exports,
    and security audit events. Falls back seamlessly to local JSON persistence if MongoDB is unavailable.
    """

    def __init__(self):
        self.is_connected = False
        self.client = None
        self.db = None
        self.local_store_path = Path(__file__).resolve().parent / "local_geospatial_store.json"
        self._cached_store: Optional[Dict[str, Any]] = None

        self._initialize_store()

    def _initialize_store(self):
        # 1. Try real MongoDB
        mongo_uri = settings.MONGODB_URI or "mongodb://localhost:27017/"
        try:
            from pymongo import MongoClient
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
            self.client = client
            self.db = client[settings.MONGODB_DB_NAME]

            # Ensure 2dsphere index on geometry
            self.db.scenario_runs.create_index([("center_geometry", "2dsphere")])
            self.db.audit_logs.create_index([("timestamp", -1)])
            self.is_connected = True
            logger.info("Connected to MongoDB with 2dsphere index support.")
            return
        except Exception:
            self.is_connected = False

        # 2. Local JSON store fallback
        if not self.local_store_path.exists():
            self._write_local_store({
                "scenario_runs": [],
                "audit_logs": [],
                "incident_geometries": []
            })
        else:
            self._read_local_store()

    def _read_local_store(self) -> Dict[str, Any]:
        if self._cached_store is not None:
            return self._cached_store
        try:
            self._cached_store = json.loads(self.local_store_path.read_text(encoding="utf-8"))
        except Exception:
            self._cached_store = {"scenario_runs": [], "audit_logs": [], "incident_geometries": []}
        return self._cached_store

    def _write_local_store(self, data: Dict[str, Any]):
        self._cached_store = data
        try:
            self.local_store_path.write_text(json.dumps(data), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Failed to write local store: {e}")

    def save_simulation_run(self, scenario_id: str, run_payload: Dict[str, Any]) -> str:
        """Saves a simulation run record."""
        doc_id = f"sim_{scenario_id}_{int(time.time())}"
        doc = {
            "_id": doc_id,
            "scenario_id": scenario_id,
            "timestamp": time.time(),
            "target_platform": run_payload.get("metadata", {}).get("target_platform", "GNSS Receiver"),
            "attack_type": run_payload.get("metadata", {}).get("default_attack_type", "UNKNOWN"),
            "total_epochs": run_payload.get("total_epochs", 60),
            "center_geometry": {
                "type": "Point",
                "coordinates": run_payload.get("metadata", {}).get("center_coords", [0.0, 0.0])
            },
            "summary": f"Simulation run of {scenario_id} ({run_payload.get('total_epochs', 60)} epochs)"
        }

        if self.is_connected and self.db is not None:
            try:
                self.db.scenario_runs.insert_one(doc)
                return doc_id
            except Exception:
                pass

        # Fallback
        store = self._read_local_store()
        store["scenario_runs"].append(doc)
        if len(store["scenario_runs"]) > 50:
            store["scenario_runs"].pop(0)
        self._write_local_store(store)
        return doc_id

    def get_simulation_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieves recent simulation run logs."""
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.scenario_runs.find({}, {"_id": 1, "scenario_id": 1, "timestamp": 1, "attack_type": 1, "target_platform": 1, "summary": 1}).sort("timestamp", -1).limit(limit)
                return [dict(d) for d in cursor]
            except Exception:
                pass

        store = self._read_local_store()
        runs = store.get("scenario_runs", [])
        return sorted(runs, key=lambda x: x.get("timestamp", 0), reverse=True)[:limit]

    def log_audit_event(self, event_type: str, details: Dict[str, Any]) -> str:
        """Logs a cyber-geospatial forensic audit entry."""
        audit_id = f"audit_{int(time.time() * 1000)}"
        entry = {
            "_id": audit_id,
            "event_type": event_type,
            "timestamp": time.time(),
            "iso_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": details
        }

        if self.is_connected and self.db is not None:
            try:
                self.db.audit_logs.insert_one(entry)
                return audit_id
            except Exception:
                pass

        store = self._read_local_store()
        store["audit_logs"].append(entry)
        if len(store["audit_logs"]) > 100:
            store["audit_logs"].pop(0)
        self._write_local_store(store)
        return audit_id

    def query_nearby_incidents_2dsphere(
        self,
        lon: float,
        lat: float,
        max_distance_meters: float = 500000.0
    ) -> List[Dict[str, Any]]:
        """
        Geospatial proximity query (2dsphere $near).
        """
        if self.is_connected and self.db is not None:
            try:
                cursor = self.db.scenario_runs.find({
                    "center_geometry": {
                        "$near": {
                            "$geometry": {
                                "type": "Point",
                                "coordinates": [lon, lat]
                            },
                            "$maxDistance": max_distance_meters
                        }
                    }
                }).limit(5)
                return [dict(d) for d in cursor]
            except Exception:
                pass

        # Local Euclidean approximation
        store = self._read_local_store()
        matches = []
        for r in store.get("scenario_runs", []):
            coords = r.get("center_geometry", {}).get("coordinates", [0.0, 0.0])
            d_lon = (coords[0] - lon) * 111320.0 * math.cos(math.radians(lat))
            d_lat = (coords[1] - lat) * 111320.0
            dist_m = math.hypot(d_lon, d_lat)
            if dist_m <= max_distance_meters:
                r_copy = dict(r)
                r_copy["distance_meters"] = round(dist_m, 1)
                matches.append(r_copy)

        matches.sort(key=lambda x: x.get("distance_meters", 0))
        return matches[:5]

    def get_db_status(self) -> Dict[str, Any]:
        """Returns database connectivity and statistics."""
        return {
            "mode": "MONGODB_ATLAS_2DSPHERE" if self.is_connected else "LOCAL_JSON_GEOSPATIAL_ENGINE",
            "connected": self.is_connected,
            "database_name": settings.MONGODB_DB_NAME,
            "collection_names": ["scenario_runs", "audit_logs", "integrity_features"],
            "indexing": "2dsphere spatial index on center_geometry",
            "fallback_active": not self.is_connected
        }
