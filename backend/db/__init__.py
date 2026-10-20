"""
AEGIS-GIS Database Persistence Layer
MongoDB 2dsphere and local geospatial JSON storage.
"""

from .mongo_service import AEGISMongoService

__all__ = ["AEGISMongoService"]
