# PHASE 1: Git Infrastructure, Environment Setup & 6-Attack GNSS Physics Simulator

## Objective
Initialize the repository, set up the directory structure and Python environment, implement fault-tolerant configuration management, and build the mathematical **GNSS Positioning, Coordinate Projection & 6-Attack RF/Pseudorange Physics Engine** along with the **4 Real-World Case Studies** from Section 5 of the research paper.

---

## Step 1.1: Git Initialization & Project Structure
1. Run `git init` and create `.gitignore` (ignoring `venv/`, `.venv/`, `node_modules/`, `__pycache__/`, `.env`, `*.pyc`, `local_qdrant_db/`).
2. Create and checkout branch `feat/phase-1-physics-engine`.
3. Create the following directory structure:
   ```text
   aegis-gis/
   ├── .env.example
   ├── requirements.txt
   ├── start_aegis.sh
   ├── start_aegis.bat
   ├── backend/
   │   ├── __init__.py
   │   ├── config.py
   │   ├── physics/
   │   │   ├── __init__.py
   │   │   ├── coordinates.py       # WGS-84 <-> ECEF <-> UTM math (Sec 2.1 & 2.2)
   │   │   ├── signal_simulator.py  # 6 Spoofing Attack RF & Pseudorange Generator (Sec 3 & 4.2)
   │   │   └── scenarios.py         # 4 Real-World Incident Scenarios (Sec 5.1 - 5.4)
   │   ├── defense/
   │   ├── gis/
   │   ├── rag_llm/
   │   ├── db/
   │   └── models/
   │       └── artifacts/
   ├── qgis_export/
   ├── tests/
   │   └── test_phase1_physics.py
   └── frontend/
   ```

## Step 1.2: Python Dependencies (`requirements.txt`)
Create `requirements.txt` and install packages:
```text
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
python-dotenv>=1.0.1
numpy>=1.26.0
scipy>=1.13.0
pandas>=2.2.0
scikit-learn>=1.4.2
shapely>=2.0.4
pyproj>=3.6.1
qdrant-client>=1.9.0
pymongo>=4.7.0
httpx>=0.27.0
pytest>=8.2.0
```
*(Note: Install these packages into the environment so all tests can run immediately.)*

## Step 1.3: Coordinate Reference System & Trilateration Engine (`backend/physics/coordinates.py`)
Implement Section 2.1 (*Trilateration and the Pseudorange Concept*) and Section 2.2 (*Coordinate Reference Systems and Map Projections*):
1. `geodetic_to_ecef(lat_deg: float, lon_deg: float, alt_m: float) -> tuple[float, float, float]` using WGS-84 ellipsoid parameters ($a = 6378137.0\text{ m}$, $f = 1 / 298.257223563$).
2. `ecef_to_geodetic(x: float, y: float, z: float) -> tuple[float, float, float]`.
3. `geodetic_to_utm(lat_deg: float, lon_deg: float) -> dict` returning `{"zone": str, "easting_m": float, "northing_m": float, "epsg": str}` using `pyproj` or exact Transverse Mercator equations.
4. `solve_wls_pvt(satellite_ecef: np.ndarray, pseudoranges: np.ndarray, weights: np.ndarray | None = None) -> dict`:
   - Solves the $4$-state Weighted Least Squares navigation equation for receiver ECEF position $(x_u, y_u, z_u)$ and clock bias $c \cdot \delta t_u$, plus computes the Geometry Matrix $\mathbf{H}$, Position Dilution of Precision ($\text{PDOP}$), Horizontal DOP ($\text{HDOP}$), and Vertical DOP ($\text{VDOP}$), and the post-fit pseudorange residual vector $\mathbf{r} = \mathbf{z} - \mathbf{H}\hat{\mathbf{x}}$.

## Step 1.4: The 6-Attack GNSS RF & Pseudorange Simulator (`backend/physics/signal_simulator.py`)
Implement a rich, physics-accurate simulator covering **Section 3 (Signal Openness, Low Power $-130\text{ dBm}$, No Legacy Auth)** and **Section 4.2 (Taxonomy of 6 Spoofing Attack Types)**:
- Define Enum `SpoofingAttackType`:
  - `AUTHENTIC = "AUTHENTIC"`
  - `SIMPLISTIC_NON_SYNC = "SIMPLISTIC_NON_SYNC"`
  - `INTERMEDIATE_SYNC = "INTERMEDIATE_SYNC"`
  - `SOPHISTICATED_RECEIVER_AWARE = "SOPHISTICATED_RECEIVER_AWARE"`
  - `MEACONING = "MEACONING"`
  - `NULLING_SUPPRESSION = "NULLING_SUPPRESSION"`
  - `DRIFT_EVASIVE_UAV = "DRIFT_EVASIVE_UAV"`
- For each epoch $t$, generate:
  - **Correlator Tap Profile (41 delay taps from $-2.0\text{ chips}$ to $+2.0\text{ chips}$):**
    - Show both the **Authentic Correlation Triangle** $R(\tau)$ and the **Injected Spoofer Correlation Triangle** $R_{\text{spoof}}(\tau - \Delta \tau)$ and their composite sum so the frontend can plot a real-time interactive **RF Correlator Peak Distortion Oscilloscope**!
  - **14 Telemetry Features:**
    - `cn0_mean_dbhz`, `cn0_moving_variance`, `sqm_ratio_metric`, `sqm_delta_asymmetry`, `clock_bias_jump_m`, `clock_drift_mps`, `pseudorange_residual_rms`, `doppler_pseudorange_rate_diff`, `carrier_phase_slip_ratio`, `agc_gain_level_db`, `doa_azimuth_variance_deg`, `ekf_innovation_mahalanobis`, `cumulative_drift_cusum`, `pdop_dilution`.
  - **Satellite Skyplot Array:** $8\text{ to }12$ multi-constellation satellites (`G01`, `G08`, `G14`, `E05`, `E11`, `E24`, `R04`, `C09`, `I01` NavIC) with azimuth, elevation, authentic $C/N_0$, tracked $C/N_0$, pseudorange residual, and `osnma_authenticated` boolean.

## Step 1.5: The 4 Real-World Case Study Scenarios (`backend/physics/scenarios.py`)
Implement Section 5.1 through 5.4 of the paper as interactive, replayable 60-epoch geospatial scenarios with real-world coordinates, authentic ground-truth paths, spoofed receiver tracks, and reference GIS boundary polygons (GeoJSON):

1. **`baltic_maritime_c4ads` (Section 5.2 — Baltic Sea Maritime Tanker / C4ADS Report):**
   - **Location:** Baltic Sea approaching Gdańsk / Kaliningrad shipping lane ($54.68^\circ\text{N}, 19.85^\circ\text{E}$).
   - **Incident Story:** One of the 45,000+ Baltic Sea interference events (Aug 2023–Apr 2024). At epoch $t=15$, an `INTERMEDIATE_SYNC` coastal spoofer hijacks the tanker's ECDIS navigation, smoothly pulling its reported position $14\text{ km}$ inland directly onto the **Khrabrovo Airport Runway** ($54.89^\circ\text{N}, 20.59^\circ\text{E}$) while the real ship continues sailing in open water.
   - **GIS Reference Geometry:** Maritime shipping corridor polygon + Coastal Landmass & Airport Runway polygon (triggers a `MARITIME_VESSEL_ON_LAND_RUNWAY` GIS spatial violation!).

2. **`vilnius_aviation_adsb` (Section 5.1 — Ryanair Approach to Vilnius / Stanford GPS Lab ADS-B):**
   - **Location:** Final approach corridor into Vilnius International Airport (EYVI, $54.634^\circ\text{N}, 25.285^\circ\text{E}$).
   - **Incident Story:** Inspired by the Jan 2025 Ryanair diversion and Stanford GPS Lab's finding of $1,500+$ daily spoofed flights. At epoch $t=12$, a high-power `MEACONING` + `SIMPLISTIC_NON_SYNC` attack triggers a sudden aircraft clock reset ($c \cdot \Delta \delta t_u > 450\text{ m}$), spurious GPWS terrain warnings, and a false $6.5\text{ km}$ lateral glide-slope offset outside the approach corridor.
   - **GIS Reference Geometry:** ICAO ILS Approach Corridor polygon.

3. **`uav_lidar_survey` (Section 5.3 — UAV Aerial LiDAR Photogrammetry Survey / Drift-Evasive Attack):**
   - **Location:** Infrastructure & topographic LiDAR survey grid over Mumbai Trans Harbour Link / Navi Mumbai coastal corridor ($18.96^\circ\text{N}, 72.97^\circ\text{E}$).
   - **Incident Story:** Implements Panda & Guo (2025, `arXiv:2507.11173`) `DRIFT_EVASIVE_UAV` attack. The attacker injects a stealthy $0.35\text{ m/s}$ pseudorange drift that evades instantaneous RAIM thresholds, silently warping the UAV's flight path outside the photogrammetry survey grid to corrupt the resulting GIS orthomosaic and Digital Surface Model (DSM).
   - **GIS Reference Geometry:** Authorized UAV LiDAR Survey Grid & Geofence polygon.

4. **`precision_ag_tractor` (Section 5.4 — Autonomous RTK Weeding Tractor in Vineyard Rows):**
   - **Location:** Nashik Precision Vineyard GIS Parcel ($20.011^\circ\text{N}, 73.790^\circ\text{E}$).
   - **Incident Story:** An autonomous RTK-guided weeding tractor relies on centimeter-level GNSS row guidance. At epoch $t=14$, a `SOPHISTICATED_RECEIVER_AWARE` spoofer offsets the position by $2.8\text{ meters}$ laterally—enough to make the tractor think it is between the rows while actually driving directly through the high-value grapevine crop rows and spraying herbicide outside the parcel boundary.
   - **GIS Reference Geometry:** Vineyard Parcel Boundary & High-Precision Crop Row Buffer Polygons.

## Step 1.6: Verification & Git Checkpoint
1. Write comprehensive unit tests in `tests/test_phase1_physics.py` verifying:
   - Round-trip accuracy of `geodetic_to_ecef` and `ecef_to_geodetic` within $10^{-4}\text{ m}$.
   - UTM zone and Easting/Northing conversion.
   - Distinct telemetry distributions and correlator tap profiles for all 7 `SpoofingAttackType` values (Authentic + 6 Attacks).
   - Generation of all 4 real-world scenarios with 60 epochs each.
2. Run `pytest tests/test_phase1_physics.py`.
3. Commit on `feat/phase-1-physics-engine`, merge to `main`, and tag `v0.1-phase1-verified`.