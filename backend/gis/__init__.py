"""
AEGIS-GIS: GIS Integrity Pipeline & PyQGIS Integration
Implements Sections 8 & 9 of the KJSCE Research Paper.
"""

from .spatial_topology_checker import (
    GISSpatialTopologyChecker,
    GISTopologyVerdict,
)
from .integrity_schema import (
    IntegrityAwareGISBuilder,
    DownstreamImpactReport,
)
from .pyqgis_exporter import (
    export_qgis_bundle,
    generate_pyqgis_script_content,
    generate_qml_style_content,
)

__all__ = [
    "GISSpatialTopologyChecker",
    "GISTopologyVerdict",
    "IntegrityAwareGISBuilder",
    "DownstreamImpactReport",
    "export_qgis_bundle",
    "generate_pyqgis_script_content",
    "generate_qml_style_content",
]
