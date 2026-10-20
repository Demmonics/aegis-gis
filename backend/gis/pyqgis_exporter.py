"""
AEGIS-GIS: Automated PyQGIS Integration & Symbology Exporter
Implements Section 8 & 9 of the KJSCE Research Paper:
Generates downloadable GeoJSON files, a standalone PyQGIS automation script (load_into_qgis.py),
and a native QGIS .qml style file for 1-click loading into QGIS Desktop.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

from .integrity_schema import IntegrityAwareGISBuilder
from ..physics.scenarios import run_scenario


def generate_pyqgis_script_content() -> str:
    """
    Returns the complete standalone Python script to be executed in the QGIS Python Console.
    """
    return '''# ==============================================================================
# AEGIS-GIS: Automated QGIS Desktop Layer Loader & Symbology Styler
# Department of AI & DS, K.J. Somaiya College of Engineering
# Paper: "When Location Lies: GNSS Spoofing and the Vulnerability of Geographic Positioning Systems"
# ==============================================================================

import os
from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsRuleBasedRenderer,
    QgsSymbol,
    QgsSimpleMarkerSymbolLayer,
    QgsSimpleLineSymbolLayer,
)
from PyQt5.QtGui import QColor

# Resolve directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__)) if '__file__' in locals() else os.getcwd()
features_path = os.path.join(script_dir, "aegis_integrity_features.geojson")
trajectories_path = os.path.join(script_dir, "aegis_trajectories.geojson")

project = QgsProject.instance()

print("[AEGIS-GIS] Loading Integrity-Aware GNSS layers into QGIS project...")

# 1. Load Point Layer with Section 8.4 Integrity Attributes
if os.path.exists(features_path):
    point_layer = QgsVectorLayer(features_path, "AEGIS GNSS Integrity Points (Sec 8.4)", "ogr")
    if point_layer.isValid():
        # Build Rule-Based Symbology
        root_rule = QgsRuleBasedRenderer.Rule(None)

        # Rule A: VERIFIED_AUTHENTIC (Emerald Green)
        sym_auth = QgsSymbol.defaultSymbol(point_layer.geometryType())
        sym_auth.setColor(QColor("#10b981"))
        sym_auth.setSize(3.5)
        rule_auth = QgsRuleBasedRenderer.Rule(sym_auth, 0, 0, '"integrity_status" = \\'VERIFIED_AUTHENTIC\\'', "Verified Authentic GNSS")
        root_rule.appendChild(rule_auth)

        # Rule B: SPOOFING_SUSPECTED (Amber)
        sym_susp = QgsSymbol.defaultSymbol(point_layer.geometryType())
        sym_susp.setColor(QColor("#f59e0b"))
        sym_susp.setSize(4.0)
        rule_susp = QgsRuleBasedRenderer.Rule(sym_susp, 0, 0, '"integrity_status" = \\'SPOOFING_SUSPECTED\\'', "Spoofing Suspected (Single Layer Alert)")
        root_rule.appendChild(rule_susp)

        # Rule C: SPOOFING_DETECTED_MITIGATED (Crimson Red)
        sym_spoof = QgsSymbol.defaultSymbol(point_layer.geometryType())
        sym_spoof.setColor(QColor("#ef4444"))
        sym_spoof.setSize(4.5)
        rule_spoof = QgsRuleBasedRenderer.Rule(sym_spoof, 0, 0, '"integrity_status" = \\'SPOOFING_DETECTED_MITIGATED\\'', "Spoofing Confirmed & Quarantined")
        root_rule.appendChild(rule_spoof)

        renderer = QgsRuleBasedRenderer(root_rule)
        point_layer.setRenderer(renderer)
        point_layer.triggerRepaint()
        project.addMapLayer(point_layer)
        print("[AEGIS-GIS] Successfully loaded point layer with 12 Section 8.4 metadata attributes!")
    else:
        print(f"[AEGIS-GIS] Failed to load layer from {features_path}")

# 2. Load Trajectories (Reported vs Ground Truth vs EKF Reconstructed)
if os.path.exists(trajectories_path):
    traj_layer = QgsVectorLayer(trajectories_path, "AEGIS Trajectories (Ground Truth / Spoofed / EKF)", "ogr")
    if traj_layer.isValid():
        root_rule_line = QgsRuleBasedRenderer.Rule(None)

        # Spoofed Trajectory (Red Dashed)
        sym_spoofed = QgsSymbol.defaultSymbol(traj_layer.geometryType())
        sym_spoofed.setColor(QColor("#ef4444"))
        sym_spoofed.setWidth(0.9)
        rule_spoofed = QgsRuleBasedRenderer.Rule(sym_spoofed, 0, 0, '"name" = \\'REPORTED_SPOOFED_TRAJECTORY\\'', "Reported Spoofed GNSS Track")
        root_rule_line.appendChild(rule_spoofed)

        # Ground Truth (Green Solid)
        sym_gt = QgsSymbol.defaultSymbol(traj_layer.geometryType())
        sym_gt.setColor(QColor("#10b981"))
        sym_gt.setWidth(0.7)
        rule_gt = QgsRuleBasedRenderer.Rule(sym_gt, 0, 0, '"name" = \\'GROUND_TRUTH_TRAJECTORY\\'', "Physical Ground Truth Path")
        root_rule_line.appendChild(rule_gt)

        # EKF Recovered (Cyan Solid)
        sym_ekf = QgsSymbol.defaultSymbol(traj_layer.geometryType())
        sym_ekf.setColor(QColor("#06b6d4"))
        sym_ekf.setWidth(0.9)
        rule_ekf = QgsRuleBasedRenderer.Rule(sym_ekf, 0, 0, '"name" = \\'AEGIS_EKF_RECOVERED_TRAJECTORY\\'', "AEGIS EKF Recovered Trajectory")
        root_rule_line.appendChild(rule_ekf)

        traj_renderer = QgsRuleBasedRenderer(root_rule_line)
        traj_layer.setRenderer(traj_renderer)
        traj_layer.triggerRepaint()
        project.addMapLayer(traj_layer)
        print("[AEGIS-GIS] Successfully loaded trajectory vectors!")

print("[AEGIS-GIS] All layers imported. Zoom to layer extent to view KJSCE GNSS defense analysis!")
'''


def generate_qml_style_content() -> str:
    """
    Returns native QGIS QML XML style definition.
    """
    return '''<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0" styleCategories="AllStyleCategories">
  <renderer-v2 type="RuleRenderer" symbollevels="0">
    <rules key="{aegis-root-rule}">
      <rule filter="&quot;integrity_status&quot; = 'VERIFIED_AUTHENTIC'" label="Verified Authentic GNSS" symbol="0" key="{auth-rule}"/>
      <rule filter="&quot;integrity_status&quot; = 'SPOOFING_SUSPECTED'" label="Spoofing Suspected" symbol="1" key="{susp-rule}"/>
      <rule filter="&quot;integrity_status&quot; = 'SPOOFING_DETECTED_MITIGATED'" label="Spoofing Confirmed &amp; Mitigated" symbol="2" key="{mitig-rule}"/>
    </rules>
    <symbols>
      <symbol type="marker" name="0" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="16,185,129,255"/>
          <prop k="size" v="3.5"/>
          <prop k="outline_color" v="255,255,255,255"/>
        </layer>
      </symbol>
      <symbol type="marker" name="1" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="245,158,11,255"/>
          <prop k="size" v="4.0"/>
          <prop k="name" v="triangle"/>
        </layer>
      </symbol>
      <symbol type="marker" name="2" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="239,68,68,255"/>
          <prop k="size" v="4.5"/>
          <prop k="name" v="diamond"/>
        </layer>
      </symbol>
    </symbols>
  </renderer-v2>
</qgis>
'''


def export_qgis_bundle(scenario_id: str = "baltic_maritime_c4ads", output_dir: Optional[Path] = None) -> Dict[str, str]:
    """
    Exports GeoJSON files, PyQGIS load script, and QML style into output directory.
    """
    if output_dir is None:
        output_dir = Path(__file__).resolve().parent.parent.parent / "qgis_export"
    output_dir.mkdir(parents=True, exist_ok=True)

    run = run_scenario(scenario_id=scenario_id, total_epochs=60)
    builder = IntegrityAwareGISBuilder()
    full_geojson = builder.build_geojson_collection(run)

    # Separate points and lines for clean GIS consumption
    point_features = [f for f in full_geojson["features"] if f["geometry"]["type"] == "Point"]
    line_features = [f for f in full_geojson["features"] if f["geometry"]["type"] in ["LineString", "Polygon"]]

    point_geojson = {
        "type": "FeatureCollection",
        "name": "aegis_integrity_points",
        "features": point_features
    }
    line_geojson = {
        "type": "FeatureCollection",
        "name": "aegis_trajectories",
        "features": line_features
    }

    # Write files
    p_feat = output_dir / "aegis_integrity_features.geojson"
    p_traj = output_dir / "aegis_trajectories.geojson"
    p_script = output_dir / "load_into_qgis.py"
    p_qml = output_dir / "aegis_integrity_style.qml"

    p_feat.write_text(json.dumps(point_geojson, indent=2), encoding="utf-8")
    p_traj.write_text(json.dumps(line_geojson, indent=2), encoding="utf-8")
    p_script.write_text(generate_pyqgis_script_content(), encoding="utf-8")
    p_qml.write_text(generate_qml_style_content(), encoding="utf-8")

    return {
        "points_geojson": str(p_feat),
        "trajectories_geojson": str(p_traj),
        "pyqgis_script": str(p_script),
        "qml_style": str(p_qml),
    }
