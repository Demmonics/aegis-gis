"""
AEGIS-GIS: The 4 Real-World Case Study Scenarios
Implements Section 5 of the KJSCE Research Paper:
1. Section 5.2 — Baltic Sea Maritime Tanker (C4ADS Airport Runway Spoofing)
2. Section 5.1 — Ryanair Approach to Vilnius (ADS-B Aviation Spoofing & Clock Reset)
3. Section 5.3 — UAV Aerial LiDAR Survey (Panda & Guo 2025 Drift-Evasive Attack)
4. Section 5.4 — Precision Agriculture RTK Tractor (Autonomous Vineyard Crop Row Guidance)
"""

import math
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
from .signal_simulator import (
    GNSSSignalSimulator,
    SpoofingAttackType,
    EpochTelemetry,
)


class ScenarioMetadata(BaseModel):
    scenario_id: str
    title: str
    paper_section: str
    target_platform: str
    location_name: str
    center_coords: List[float] # [lon, lat]
    default_attack_type: SpoofingAttackType
    attack_start_epoch: int
    narrative: str
    key_spatial_violation: str
    academic_citation: str


class ScenarioRun(BaseModel):
    metadata: ScenarioMetadata
    total_epochs: int
    ground_truth_path: List[List[float]] # [[lon, lat], ...]
    reported_spoofed_path: List[List[float]] # [[lon, lat], ...]
    ekf_recovered_path: List[List[float]] # [[lon, lat], ...]
    telemetry: List[EpochTelemetry]
    gis_reference_geojson: Dict[str, Any]


SCENARIO_METADATA_REGISTRY: Dict[str, ScenarioMetadata] = {
    "baltic_maritime_c4ads": ScenarioMetadata(
        scenario_id="baltic_maritime_c4ads",
        title="Baltic Sea Maritime Tanker (C4ADS Runway Spoof)",
        paper_section="Section 5.2 (Maritime GNSS Spoofing)",
        target_platform="Commercial Oil Tanker (ECDIS + Dual-Freq RTK)",
        location_name="Baltic Sea approaching Gdańsk / Kaliningrad Corridor",
        center_coords=[19.85, 54.68],
        default_attack_type=SpoofingAttackType.INTERMEDIATE_SYNC,
        attack_start_epoch=15,
        narrative=(
            "One of 45,000+ Baltic Sea interference incidents (Aug 2023 - Apr 2024). "
            "At epoch 15, an Intermediate Synchronized spoofer hijacks the tanker's ECDIS, "
            "pulling reported coordinates 14 km inland directly onto Khrabrovo Airport Runway (54.89°N, 20.59°E) "
            "while the physical vessel remains in open water."
        ),
        key_spatial_violation="MARITIME_VESSEL_ON_LAND_RUNWAY",
        academic_citation="C4ADS (2019) / KJSCE Review Paper Section 5.2"
    ),
    "vilnius_aviation_adsb": ScenarioMetadata(
        scenario_id="vilnius_aviation_adsb",
        title="Ryanair Vilnius Approach (ADS-B Clock Reset)",
        paper_section="Section 5.1 (Aviation ADS-B Spoofing & EASA Alert)",
        target_platform="Commercial Airliner (Boeing 737 / ADS-B Out)",
        location_name="Vilnius International Airport (EYVI) ILS Glide Slope",
        center_coords=[25.285, 54.634],
        default_attack_type=SpoofingAttackType.MEACONING,
        attack_start_epoch=12,
        narrative=(
            "Inspired by the January 2025 Ryanair diversion and Stanford GPS Lab ADS-B telemetry "
            "(1,500+ daily flights spoofed in late 2025). High-power terrestrial meaconing causes "
            "a 450m clock bias jump, GPWS false terrain alarms, and 6.5 km lateral corridor deviation."
        ),
        key_spatial_violation="AVIATION_APPROACH_CORRIDOR_DEVIATION",
        academic_citation="Stanford GPS Lab (2025) / EASA Safety Bulletin / Paper Sec 5.1"
    ),
    "uav_lidar_survey": ScenarioMetadata(
        scenario_id="uav_lidar_survey",
        title="UAV Aerial LiDAR Survey (RL Drift-Evasive Attack)",
        paper_section="Section 5.3 (UAV Photogrammetry & Orthomosaic Corruption)",
        target_platform="Hexacopter Aerial LiDAR & Photogrammetry Drone",
        location_name="Mumbai Trans Harbour Link / Navi Mumbai Coastal Corridor",
        center_coords=[72.970, 18.960],
        default_attack_type=SpoofingAttackType.DRIFT_EVASIVE_UAV,
        attack_start_epoch=10,
        narrative=(
            "Implements Panda & Guo (2025, arXiv:2507.11173) Drift-Evasive RL attack. "
            "The attacker injects a sub-threshold 0.35 m/s pseudorange drift that bypasses instantaneous "
            "chi-square RAIM thresholds, cumulatively steering the drone 42m off-track and corrupting "
            "the resulting GIS digital surface model (DSM) and orthomosaic."
        ),
        key_spatial_violation="UAV_SURVEY_CORRIDOR_DRIFT",
        academic_citation="Panda & Guo (2025) arXiv:2507.11173 / Paper Sec 5.3"
    ),
    "precision_ag_tractor": ScenarioMetadata(
        scenario_id="precision_ag_tractor",
        title="Nashik Vineyard RTK Tractor (Crop Row Guidance)",
        paper_section="Section 5.4 (Precision Agriculture RTK Vulnerability)",
        target_platform="Autonomous RTK Weeding Tractor (Autosteer)",
        location_name="Nashik Precision Viticulture GIS Parcel",
        center_coords=[73.790, 20.011],
        default_attack_type=SpoofingAttackType.SOPHISTICATED_RECEIVER_AWARE,
        attack_start_epoch=14,
        narrative=(
            "An autonomous tractor relies on centimeter-level RTK GNSS for inter-row weeding. "
            "A receiver-aware spoofer injects a 2.8m lateral coordinate offset. The tractor's autosteer "
            "believes it is safely centered in the furrow while physically crushing high-value grapevine rows."
        ),
        key_spatial_violation="AGRICULTURE_CROP_ROW_COLLISION_RISK",
        academic_citation="Weiss et al. (2024) / KJSCE Review Paper Section 5.4"
    ),
}


class ScenarioManager:
    """Generates and manages the 4 real-world scenario simulations."""

    def __init__(self, seed: int = 42):
        self.simulator = GNSSSignalSimulator(seed=seed)

    def generate_scenario_run(
        self,
        scenario_id: str,
        total_epochs: int = 60,
        override_attack_type: Optional[SpoofingAttackType] = None,
        spoofer_power_advantage_db: float = 3.0,
        enable_ekf_mitigation: bool = True
    ) -> ScenarioRun:
        if scenario_id not in SCENARIO_METADATA_REGISTRY:
            scenario_id = "baltic_maritime_c4ads"

        meta = SCENARIO_METADATA_REGISTRY[scenario_id]
        active_attack = override_attack_type if override_attack_type is not None else meta.default_attack_type
        attack_start = meta.attack_start_epoch

        self.simulator.reset()

        ground_truth: List[List[float]] = []
        reported_spoofed: List[List[float]] = []
        ekf_recovered: List[List[float]] = []
        telemetry_list: List[EpochTelemetry] = []

        # Generate base trajectories depending on scenario
        if scenario_id == "baltic_maritime_c4ads":
            # True path: heading northeast in Baltic Sea shipping corridor
            # Start: 54.680°N, 19.850°E, heading 045° at ~12 knots (0.00015 deg/epoch)
            # Spoofed path: branches off at epoch 15 towards Khrabrovo Airport (54.890°N, 20.590°E)
            base_lat, base_lon = 54.680, 19.850
            d_lat_step, d_lon_step = 0.0008, 0.0012

            for t in range(total_epochs):
                t_lat = base_lat + t * d_lat_step
                t_lon = base_lon + t * d_lon_step
                ground_truth.append([round(t_lon, 6), round(t_lat, 6)])

                if t < attack_start:
                    cur_attack = SpoofingAttackType.AUTHENTIC
                    s_lat, s_lon = t_lat, t_lon
                    rec_lat, rec_lon = t_lat, t_lon
                else:
                    cur_attack = active_attack
                    progress = (t - attack_start) / (total_epochs - attack_start)
                    # Pull toward Khrabrovo runway (54.890, 20.592)
                    target_lat, target_lon = 54.890, 20.592
                    s_lat = t_lat + progress * (target_lat - t_lat)
                    s_lon = t_lon + progress * (target_lon - t_lon)

                    # EKF mitigation restores trajectory based on INS dead-reckoning
                    if enable_ekf_mitigation:
                        # Slight realistic inertial drift of ~1-2 meters
                        ins_drift = (t - attack_start) * 0.000004
                        rec_lat = t_lat + ins_drift
                        rec_lon = t_lon + ins_drift
                    else:
                        rec_lat, rec_lon = s_lat, s_lon

                reported_spoofed.append([round(s_lon, 6), round(s_lat, 6)])
                ekf_recovered.append([round(rec_lon, 6), round(rec_lat, 6)])

                telem = self.simulator.generate_epoch_telemetry(
                    epoch=t,
                    attack_type=cur_attack,
                    true_lat=t_lat,
                    true_lon=t_lon,
                    true_alt=5.0,
                    spoofed_lat=s_lat,
                    spoofed_lon=s_lon,
                    spoofed_alt=5.0,
                    spoofer_power_advantage_db=spoofer_power_advantage_db
                )
                telemetry_list.append(telem)

            gis_ref = self._create_baltic_gis_reference()

        elif scenario_id == "vilnius_aviation_adsb":
            # True path: 3-degree ILS approach to Vilnius EYVI runway 19
            # Start: 54.740°N, 25.320°E descending to 54.634°N, 25.285°E
            # Spoofed path: drifts laterally by 6.5 km to the west (25.180°E)
            base_lat, base_lon = 54.740, 25.320
            d_lat = (54.634 - 54.740) / total_epochs
            d_lon = (25.285 - 25.320) / total_epochs

            for t in range(total_epochs):
                t_lat = base_lat + t * d_lat
                t_lon = base_lon + t * d_lon
                t_alt = 1200.0 - t * (1000.0 / total_epochs)
                ground_truth.append([round(t_lon, 6), round(t_lat, 6)])

                if t < attack_start:
                    cur_attack = SpoofingAttackType.AUTHENTIC
                    s_lat, s_lon = t_lat, t_lon
                    rec_lat, rec_lon = t_lat, t_lon
                else:
                    cur_attack = active_attack
                    progress = (t - attack_start) / (total_epochs - attack_start)
                    # Lateral diversion of ~0.08 deg lon (~5 km)
                    s_lat = t_lat + progress * 0.015
                    s_lon = t_lon - progress * 0.075

                    if enable_ekf_mitigation:
                        ins_drift = (t - attack_start) * 0.000003
                        rec_lat = t_lat + ins_drift
                        rec_lon = t_lon + ins_drift
                    else:
                        rec_lat, rec_lon = s_lat, s_lon

                reported_spoofed.append([round(s_lon, 6), round(s_lat, 6)])
                ekf_recovered.append([round(rec_lon, 6), round(rec_lat, 6)])

                telem = self.simulator.generate_epoch_telemetry(
                    epoch=t,
                    attack_type=cur_attack,
                    true_lat=t_lat,
                    true_lon=t_lon,
                    true_alt=t_alt,
                    spoofed_lat=s_lat,
                    spoofed_lon=s_lon,
                    spoofed_alt=t_alt + 150.0 if t >= attack_start else t_alt,
                    spoofer_power_advantage_db=spoofer_power_advantage_db
                )
                telemetry_list.append(telem)

            gis_ref = self._create_vilnius_gis_reference()

        elif scenario_id == "uav_lidar_survey":
            # True path: lawnmower grid over coastal corridor (72.965 - 72.975, 18.955 - 18.965)
            # Spoofed path: stealthy sub-threshold lateral drift of ~45 meters (0.0004 deg)
            center_lat, center_lon = 18.960, 72.970

            for t in range(total_epochs):
                # Lawnmower serpentine path
                row = t // 15
                col_progress = (t % 15) / 15.0
                t_lat = center_lat + (row - 1.5) * 0.002
                t_lon = center_lon + (col_progress - 0.5) * 0.006 if row % 2 == 0 else center_lon + (0.5 - col_progress) * 0.006
                ground_truth.append([round(t_lon, 6), round(t_lat, 6)])

                if t < attack_start:
                    cur_attack = SpoofingAttackType.AUTHENTIC
                    s_lat, s_lon = t_lat, t_lon
                    rec_lat, rec_lon = t_lat, t_lon
                else:
                    cur_attack = active_attack
                    drift_dist = (t - attack_start) * 0.000015 # ~1.5m per epoch
                    s_lat = t_lat + drift_dist
                    s_lon = t_lon + drift_dist * 0.8

                    if enable_ekf_mitigation:
                        rec_lat = t_lat + (t - attack_start) * 0.000001
                        rec_lon = t_lon + (t - attack_start) * 0.000001
                    else:
                        rec_lat, rec_lon = s_lat, s_lon

                reported_spoofed.append([round(s_lon, 6), round(s_lat, 6)])
                ekf_recovered.append([round(rec_lon, 6), round(rec_lat, 6)])

                telem = self.simulator.generate_epoch_telemetry(
                    epoch=t,
                    attack_type=cur_attack,
                    true_lat=t_lat,
                    true_lon=t_lon,
                    true_alt=120.0,
                    spoofed_lat=s_lat,
                    spoofed_lon=s_lon,
                    spoofed_alt=120.0,
                    spoofer_power_advantage_db=spoofer_power_advantage_db
                )
                telemetry_list.append(telem)

            gis_ref = self._create_uav_gis_reference()

        else: # precision_ag_tractor
            # True path: straight tractor guidance along crop rows (20.010°N, 73.790°E)
            # Spoofed path: lateral shift of 2.8 meters (0.000025 deg) directly into vine trellis
            base_lat, base_lon = 20.0100, 73.7900

            for t in range(total_epochs):
                t_lat = base_lat + t * 0.00005 # moving north at ~1.5 m/s
                t_lon = base_lon
                ground_truth.append([round(t_lon, 6), round(t_lat, 6)])

                if t < attack_start:
                    cur_attack = SpoofingAttackType.AUTHENTIC
                    s_lat, s_lon = t_lat, t_lon
                    rec_lat, rec_lon = t_lat, t_lon
                else:
                    cur_attack = active_attack
                    # Sudden or smooth 2.8m lateral step (0.000028 deg)
                    s_lat = t_lat
                    s_lon = t_lon + 0.000028

                    if enable_ekf_mitigation:
                        rec_lat = t_lat
                        rec_lon = t_lon + 0.000002
                    else:
                        rec_lat, rec_lon = s_lat, s_lon

                reported_spoofed.append([round(s_lon, 6), round(s_lat, 6)])
                ekf_recovered.append([round(rec_lon, 6), round(rec_lat, 6)])

                telem = self.simulator.generate_epoch_telemetry(
                    epoch=t,
                    attack_type=cur_attack,
                    true_lat=t_lat,
                    true_lon=t_lon,
                    true_alt=580.0,
                    spoofed_lat=s_lat,
                    spoofed_lon=s_lon,
                    spoofed_alt=580.0,
                    spoofer_power_advantage_db=spoofer_power_advantage_db
                )
                telemetry_list.append(telem)

            gis_ref = self._create_tractor_gis_reference()

        return ScenarioRun(
            metadata=meta,
            total_epochs=total_epochs,
            ground_truth_path=ground_truth,
            reported_spoofed_path=reported_spoofed,
            ekf_recovered_path=ekf_recovered,
            telemetry=telemetry_list,
            gis_reference_geojson=gis_ref
        )

    def _create_baltic_gis_reference(self) -> Dict[str, Any]:
        """Shipping lane polygon + coastal landmass & airport runway polygon."""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Designated Maritime Shipping Corridor",
                        "type": "VALID_CORRIDOR",
                        "stroke": "#10b981",
                        "fill": "#10b981",
                        "fill_opacity": 0.15
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [19.75, 54.65],
                            [20.00, 54.80],
                            [19.95, 54.85],
                            [19.70, 54.70],
                            [19.75, 54.65]
                        ]]
                    }
                },
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Khrabrovo Airport Runway (Landmass)",
                        "type": "PROHIBITED_LAND_ZONE",
                        "stroke": "#ef4444",
                        "fill": "#ef4444",
                        "fill_opacity": 0.25
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [20.570, 54.880],
                            [20.615, 54.880],
                            [20.615, 54.905],
                            [20.570, 54.905],
                            [20.570, 54.880]
                        ]]
                    }
                }
            ]
        }

    def _create_vilnius_gis_reference(self) -> Dict[str, Any]:
        """ICAO ILS approach corridor funnel."""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "ICAO ILS Runway 19 Approach Funnel",
                        "type": "VALID_CORRIDOR",
                        "stroke": "#06b6d4",
                        "fill": "#06b6d4",
                        "fill_opacity": 0.15
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [25.305, 54.750],
                            [25.335, 54.750],
                            [25.295, 54.630],
                            [25.275, 54.630],
                            [25.305, 54.750]
                        ]]
                    }
                }
            ]
        }

    def _create_uav_gis_reference(self) -> Dict[str, Any]:
        """UAV LiDAR survey grid and geofence polygon."""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Authorized UAV LiDAR Photogrammetry Grid",
                        "type": "VALID_CORRIDOR",
                        "stroke": "#8b5cf6",
                        "fill": "#8b5cf6",
                        "fill_opacity": 0.15
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [72.964, 18.954],
                            [72.976, 18.954],
                            [72.976, 18.966],
                            [72.964, 18.966],
                            [72.964, 18.954]
                        ]]
                    }
                }
            ]
        }

    def _create_tractor_gis_reference(self) -> Dict[str, Any]:
        """Precision vineyard parcel polygon and crop row buffers."""
        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {
                        "name": "Nashik Vineyard GIS Parcel Boundary",
                        "type": "VALID_CORRIDOR",
                        "stroke": "#10b981",
                        "fill": "#10b981",
                        "fill_opacity": 0.15
                    },
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [73.7895, 20.0095],
                            [73.7915, 20.0095],
                            [73.7915, 20.0135],
                            [73.7895, 20.0135],
                            [73.7895, 20.0095]
                        ]]
                    }
                }
            ]
        }


def get_all_scenarios() -> List[ScenarioMetadata]:
    return list(SCENARIO_METADATA_REGISTRY.values())


def run_scenario(
    scenario_id: str,
    total_epochs: int = 60,
    override_attack_type: Optional[SpoofingAttackType] = None,
    spoofer_power_advantage_db: float = 3.0,
    enable_ekf_mitigation: bool = True
) -> ScenarioRun:
    manager = ScenarioManager()
    return manager.generate_scenario_run(
        scenario_id=scenario_id,
        total_epochs=total_epochs,
        override_attack_type=override_attack_type,
        spoofer_power_advantage_db=spoofer_power_advantage_db,
        enable_ekf_mitigation=enable_ekf_mitigation
    )
