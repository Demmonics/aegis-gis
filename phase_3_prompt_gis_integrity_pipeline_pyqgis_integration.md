# PHASE 3: GIS-Assisted Spoofing Detection, Section 8.4 Integrity Schema & PyQGIS Exporter

## Objective
Implement **Section 8 (*Implications of GNSS Spoofing for GIS Practice*)** and **Section 9 (*GIS-Assisted Spoofing Detection & Integrity-Aware GIS Schemas*)** of the research paper. This is what elevates the project from a pure signal-processing model into a true **Geographic Information Systems (GIS)** engineering masterpiece.

---

## Step 3.1: Git Branch Setup
Create and checkout branch `feat/phase-3-gis-integrity-pipeline`.

## Step 3.2: GIS-Assisted Spatial Topology Detector (`backend/gis/spatial_topology_checker.py`)
In Section 9 of the paper, the authors propose:
> *"A particularly promising research direction is GIS assisted spoofing detection. Instead of evaluating a coordinate only from GNSS measurements, a system could combine GNSS signal features with trajectory continuity, known road or field geometry, ground-control points, historical observations and independent sensors."*

Implement `GISSpatialTopologyChecker` using `shapely.geometry` (`Point`, `LineString`, `Polygon`) and `pyproj`:
1. **Spatial Rule 1 — Maritime Land/Runway Intersection Check (Baltic Sea C4ADS Scenario):**
   - Checks if a maritime vessel's reported WGS-84 coordinate intersects the coastal landmass or airport runway polygon (`ST_Intersects`) or exits the designated shipping lane buffer (`ST_Distance`).
   - Raises `MARITIME_VESSEL_ON_LAND_RUNWAY` with exact distance in meters from the valid sea corridor.
2. **Spatial Rule 2 — Aviation Approach Corridor & Kinematic Continuity Check (Vilnius ADS-B Scenario):**
   - Checks if the aircraft's reported position violates the 3D ICAO approach funnel polygon or exhibits physically impossible lateral acceleration ($a_{\text{lat}} > 4g$) relative to consecutive timestamps.
   - Raises `AVIATION_APPROACH_CORRIDOR_DEVIATION`.
3. **Spatial Rule 3 — UAV Survey Geofence & Photogrammetry Overlap Check (UAV LiDAR Scenario):**
   - Computes whether the UAV's flight line drifts outside the planned LiDAR flight strip buffer, calculating the **Percentage of Corrupted Orthomosaic / DSM Area (%)** if the spoofed coordinates were ingested without filtering!
   - Raises `UAV_SURVEY_CORRIDOR_DRIFT`.
4. **Spatial Rule 4 — Precision Agriculture Crop Row Boundary Check (Autonomous Tractor Scenario):**
   - Checks centimeter-level lateral cross-track error (XTE) from the GIS vineyard row centerline `LineString`. If $\text{XTE} > 0.25\text{ m}$, flags `AGRICULTURE_CROP_ROW_COLLISION_RISK` and calculates how many meters of crop rows would have been damaged without EKF mitigation.

## Step 3.3: Section 8.4 Integrity-Aware GIS Schema & GeoJSON Builder (`backend/gis/integrity_schema.py`)
Implement `IntegrityAwareGISBuilder`:
1. Converts any analyzed scenario run into a standards-compliant GeoJSON `FeatureCollection` containing:
   - Every observation point populated with all **12 mandatory Integrity Metadata fields from Section 8.4** (`receiver_type`, `timestamp_utc`, `crs_epsg`, `utm_projection`, `estimated_accuracy_m`, `pdop`, `satellite_count`, `cn0_dbhz`, `correction_status`, `authentication_status`, `integrity_status`, `independent_sensor_validated`, plus `ml_classification` and `gis_topology_check`).
   - Three distinct `LineString` features:
     - `REPORTED_SPOOFED_TRAJECTORY` (what a legacy GIS pipeline blindly ingests)
     - `GROUND_TRUTH_TRAJECTORY` (actual physical path)
     - `AEGIS_EKF_RECOVERED_TRAJECTORY` (the protected path restored by our 5-layer defense)
   - The reference GIS context polygons (shipping lane, airport runway, ILS approach corridor, UAV survey grid, or vineyard crop rows).
2. Computes a **GIS Data Quality & Downstream Impact Assessment Report** comparing:
   - **Legacy Unprotected GIS Pipeline:** Positional Root Mean Square Error ($\text{RMSE}$ in meters), percentage of corrupted spatial features ingested, and downstream spatial analysis error (buffer/overlay corruption area in $\text{m}^2$).
   - **AEGIS Integrity-Aware GIS Pipeline:** Mitigated $\text{RMSE}$ in meters, $100\%$ quarantine of spoofed points, and preserved spatial topology integrity.

## Step 3.4: Automated PyQGIS Script & Symbology Exporter (`backend/gis/pyqgis_exporter.py`)
Build a generator that writes ready-to-use files into `qgis_export/` and serves them as a downloadable ZIP/bundle via the API:
1. `qgis_export/aegis_integrity_features.geojson`
2. `qgis_export/aegis_trajectories.geojson`
3. `qgis_export/load_into_qgis.py`:
   - A well-documented **PyQGIS script** that uses `QgsVectorLayer`, `QgsProject`, `QgsRuleBasedRenderer`, and `QgsSymbol` to load the GeoJSON layers into QGIS desktop, automatically color-coding points by `integrity_status` (`VERIFIED_AUTHENTIC` = Emerald Green, `SPOOFING_SUSPECTED` = Amber, `SPOOFING_DETECTED_MITIGATED` = Crimson Red, `EKF_RECOVERED` = Cyan).
4. `qgis_export/aegis_integrity_style.qml`:
   - A native QGIS `.qml` layer style definition file.

## Step 3.5: Verification & Git Checkpoint
1. Write tests in `tests/test_phase3_gis_pipeline.py` verifying:
   - All 4 scenarios trigger their respective spatial topology violations during spoofing epochs and pass during authentic epochs.
   - Generated GeoJSON strictly contains all Section 8.4 metadata attributes and valid WGS-84 + UTM coordinates.
   - `qgis_export/load_into_qgis.py` and `.geojson` files are generated cleanly on disk.
2. Run `pytest tests/test_phase3_gis_pipeline.py`.
3. Commit on `feat/phase-3-gis-integrity-pipeline`, merge to `main`, and tag `v0.3-phase3-verified`.