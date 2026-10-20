"""
AEGIS-GIS: Global Incident Simulation Engine & Multi-Scenario Generator
Implements Section 5 of the Research Paper:
1. Aviation: Ryanair Vilnius Landing Abort (2025 EASA Alert & Missed Approach)
2. Maritime: Baltic Sea C4ADS (2024 Merchant Tanker Airport Runway Spoof)
3. UAV/Drone: Drift-Evasive RL Photogrammetry Corruption (Panda & Guo 2025)
4. Precision Agriculture: Nashik Vineyard Autonomous RTK Tractor Row Escape
"""

import os
import json
import math
from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np


def haversine_distance_m(p1: List[float], p2: List[float]) -> float:
    """Calculates haversine distance in meters between two [lat, lon] points."""
    R = 6371000.0  # Earth radius in meters
    lat1, lon1 = math.radians(p1[0]), math.radians(p1[1])
    lat2, lon2 = math.radians(p2[0]), math.radians(p2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


class GlobalScenarioEngine:
    """Generates high-fidelity 60-epoch cyber-physical simulation tracks for 4 global domains."""

    def __init__(self, output_dir: Optional[Path] = None):
        if output_dir is None:
            self.output_dir = Path(__file__).resolve().parent / "data"
        else:
            self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_aviation_vilnius(self, total_epochs: int = 60) -> Dict[str, Any]:
        """
        Scenario 1: Aviation (Vilnius EYVI Landing Abort - 2025).
        Ryanair B737 descending on ILS Approach to Runway 19.
        Epoch 0-19: Nominal 3° ILS glide slope descent (1200m -> 450m).
        Epoch 20: High-power meaconing attack activates from Kaliningrad/Belarus border.
        Epoch 20-35: Spoofer introduces sudden clock jump and GPWS false terrain alarm.
        Epoch 30+: Pilots execute TOGA go-around, climbing back to 2500m and diverting to Warsaw.
        """
        attack_start = 20
        spoofer_loc = [54.580, 25.420]
        base_lat, base_lon = 54.760, 25.320
        dest_lat, dest_lon = 54.634, 25.285  # EYVI Runway 19

        epochs_data = []
        for t in range(total_epochs):
            if t < attack_start:
                # Approach descent along glide slope
                prog = t / attack_start
                cur_lat = base_lat + prog * (dest_lat - base_lat)
                cur_lon = base_lon + prog * (dest_lon - base_lon)
                alt = 1200.0 - prog * 750.0  # 1200m -> 450m
                speed = 145.0  # knots
                heading = 195.0
                is_attack = False

                s_lat, s_lon = cur_lat, cur_lon
                rec_lat, rec_lon = cur_lat, cur_lon
                cn0 = 43.5 + np.sin(t * 0.2) * 1.2
                agc = -84.0 + np.random.normal(0, 1.0)
                doa_var = 1.45
                violation = None
                alert = None
            else:
                is_attack = True
                prog = (t - attack_start) / (total_epochs - attack_start)
                # True physical flight: Pulls up, climbs to 2500m, turns southwest toward Warsaw (230°)
                climb_prog = min(1.0, prog * 1.5)
                cur_lat = dest_lat - prog * 0.08
                cur_lon = dest_lon - prog * 0.12
                alt = 450.0 + climb_prog * 2050.0  # Climbs 450m -> 2500m
                speed = 220.0 + climb_prog * 40.0
                heading = 230.0

                # Spoofed GNSS Fix: Drifts 6.5 km west, false altitude drops to 0m (triggering GPWS terrain alarm)
                drift_lat = prog * 0.02
                drift_lon = -prog * 0.09  # ~6.5 km west
                s_lat = cur_lat + drift_lat
                s_lon = cur_lon + drift_lon

                # EKF IRS + Baro altimeter keeps true aircraft position
                rec_lat = cur_lat + prog * 0.00004
                rec_lon = cur_lon + prog * 0.00004

                cn0 = 24.5 + np.random.normal(0, 1.5)  # Jammed/meaconed carrier drop
                agc = -46.0 + np.random.normal(0, 2.0)
                doa_var = 0.015

                if t >= 25:
                    violation = "ILS_GLIDEPATH_COLLAPSE & FALSE_TERRAIN_GPWS"
                    alert = "🚨 GPWS TERRAIN ALARM: FALSE GROUND PROXIMITY ALERT — GO-AROUND INITIATED 🚨"
                else:
                    violation = "SPOOFED_CLOCK_STEP"
                    alert = "⚠️ GNSS Time Step (+450ns) & Lateral Deviation Detected"

            drift_m = haversine_distance_m([cur_lat, cur_lon], [s_lat, s_lon])

            epochs_data.append({
                "epoch": t,
                "true_pos": [round(cur_lat, 6), round(cur_lon, 6)],
                "spoofed_pos": [round(s_lat, 6), round(s_lon, 6)],
                "ekf_pos": [round(rec_lat, 6), round(rec_lon, 6)],
                "altitude_m": round(alt, 1),
                "speed": round(speed, 1),
                "speed_unit": "knots",
                "heading_deg": round(heading, 1),
                "inferred_cn0": round(cn0, 1),
                "agc_attenuation_db": round(agc, 1),
                "doa_azimuth_var": round(doa_var, 4),
                "position_drift_m": round(drift_m, 1),
                "is_attack_active": is_attack,
                "gis_violation": violation,
                "alert_message": alert,
            })

        corridor_poly = [
            [54.770, 25.350],
            [54.770, 25.290],
            [54.630, 25.260],
            [54.630, 25.310],
            [54.770, 25.350],
        ]

        runway_poly = [
            [54.645, 25.280],
            [54.645, 25.295],
            [54.625, 25.295],
            [54.625, 25.280],
            [54.645, 25.280],
        ]

        return {
            "scenario_id": "aviation_vilnius",
            "domain": "aviation",
            "title": "Aviation: Ryanair Vilnius Approach (EASA Alert 2025)",
            "target_vehicle": "Ryanair Boeing 737-800 (ADS-B Out + IRS)",
            "vehicle_type": "airplane",
            "location_name": "Vilnius International Airport (EYVI) ILS Glide Slope",
            "map_center": [54.680, 25.280],
            "default_zoom": 11,
            "attack_start_epoch": attack_start,
            "spoofer_location": spoofer_loc,
            "narrative_phases": [
                {"phase": 1, "epochs": "0-19", "title": "Nominal ILS Descent", "desc": "Aircraft on 3-degree glide slope descending from 1200m. ADS-B broadcast nominal."},
                {"phase": 2, "epochs": "20-29", "title": "Meaconing & False Terrain", "desc": "Terrestrial spoofer injects 450m clock bias step. GPWS sounds false terrain pull-up."},
                {"phase": 3, "epochs": "30-59", "title": "Missed Approach & Divert", "desc": "Pilots execute TOGA go-around, climbing back to 2500m and diverting to Warsaw."}
            ],
            "gis_polygons": [
                {"name": "ICAO ILS Approach Funnel", "coords": corridor_poly, "color": "#06b6d4", "type": "CORRIDOR"},
                {"name": "EYVI Runway 19", "coords": runway_poly, "color": "#10b981", "type": "RUNWAY"}
            ],
            "epochs": epochs_data,
        }

    def generate_maritime_baltic(self, total_epochs: int = 60) -> Dict[str, Any]:
        """
        Scenario 2: Maritime (Baltic Sea C4ADS - 2024).
        100,000 DWT Commercial Tanker navigating legitimate Baltic traffic lane.
        Epoch 0-14: Vessel moves at 12.4 knots in shipping corridor.
        Epoch 15+: Coastal spoofer drags reported GPS fix 14.8 km inland onto Khrabrovo Airport runway.
        """
        attack_start = 15
        spoofer_loc = [54.745, 20.150]
        base_lat, base_lon = 54.680, 19.850
        runway_lat, runway_lon = 54.890, 20.592

        epochs_data = []
        for t in range(total_epochs):
            t_lat = base_lat + t * 0.0008
            t_lon = base_lon + t * 0.0012

            if t < attack_start:
                s_lat, s_lon = t_lat, t_lon
                rec_lat, rec_lon = t_lat, t_lon
                is_attack = False
                cn0 = 42.0 + np.sin(t * 0.15) * 1.0
                agc = -85.0
                doa_var = 1.42
                violation = None
                alert = None
            else:
                is_attack = True
                prog = (t - attack_start) / (total_epochs - attack_start)
                s_lat = t_lat + prog * (runway_lat - t_lat)
                s_lon = t_lon + prog * (runway_lon - t_lon)

                # EKF dead-reckoning keeps vessel on true course
                rec_lat = t_lat + prog * 0.00003
                rec_lon = t_lon + prog * 0.00003

                cn0 = 48.5 + np.random.normal(0, 1.2)  # Artificial overpower
                agc = -39.0 + np.random.normal(0, 1.5)
                doa_var = 0.012

                if t >= 26:
                    violation = "IMPOSSIBLE_LAND_TRANSIT"
                    alert = "🚨 CRITICAL GIS VIOLATION: MARITIME VESSEL DETECTED ON INLAND AIRPORT RUNWAY 🚨"
                else:
                    violation = "CORRELATOR_PULL_OFF"
                    alert = "⚠️ GNSS Pull-Off Detected: Correlator Asymmetry Alert"

            drift_m = haversine_distance_m([t_lat, t_lon], [s_lat, s_lon])

            epochs_data.append({
                "epoch": t,
                "true_pos": [round(t_lat, 6), round(t_lon, 6)],
                "spoofed_pos": [round(s_lat, 6), round(s_lon, 6)],
                "ekf_pos": [round(rec_lat, 6), round(rec_lon, 6)],
                "altitude_m": 0.0,
                "speed": 12.4,
                "speed_unit": "knots",
                "heading_deg": 45.0,
                "inferred_cn0": round(cn0, 1),
                "agc_attenuation_db": round(agc, 1),
                "doa_azimuth_var": round(doa_var, 4),
                "position_drift_m": round(drift_m, 1),
                "is_attack_active": is_attack,
                "gis_violation": violation,
                "alert_message": alert,
            })

        corridor_poly = [
            [54.62, 19.75],
            [54.72, 20.15],
            [54.82, 20.05],
            [54.72, 19.65],
            [54.62, 19.75],
        ]

        runway_poly = [
            [54.880, 20.570],
            [54.880, 20.615],
            [54.905, 20.615],
            [54.905, 20.570],
            [54.880, 20.570],
        ]

        return {
            "scenario_id": "maritime_baltic",
            "domain": "maritime",
            "title": "Maritime: Baltic Sea Tanker Runway Teleport (C4ADS)",
            "target_vehicle": "100,000 DWT Commercial Tanker (ECDIS + RTK)",
            "vehicle_type": "ship",
            "location_name": "Baltic Sea approaching Gdańsk / Kaliningrad Corridor",
            "map_center": [54.780, 20.200],
            "default_zoom": 10,
            "attack_start_epoch": attack_start,
            "spoofer_location": spoofer_loc,
            "narrative_phases": [
                {"phase": 1, "epochs": "0-14", "title": "Authentic Navigation", "desc": "Tanker navigating designated IMO corridor. Multi-constellation signals healthy."},
                {"phase": 2, "epochs": "15-25", "title": "Signal Injection & Pull-off", "desc": "Hostile coastal SDR begins intermediate pull-off with +3 dB power advantage."},
                {"phase": 3, "epochs": "26-59", "title": "Runway Capture & Alarm", "desc": "Reported fix pulled 14.8 km inland onto Khrabrovo military runway."}
            ],
            "gis_polygons": [
                {"name": "Designated Shipping Lane", "coords": corridor_poly, "color": "#10b981", "type": "CORRIDOR"},
                {"name": "Khrabrovo Airport Runway (Inland)", "coords": runway_poly, "color": "#ef4444", "type": "RUNWAY"}
            ],
            "epochs": epochs_data,
        }

    def generate_uav_drift(self, total_epochs: int = 60) -> Dict[str, Any]:
        """
        Scenario 3: UAV Aerial LiDAR Survey (Panda & Guo 2025 Drift-Evasive Attack).
        Hexacopter performing an automated photogrammetry grid survey at 120m altitude.
        Epoch 0-11: Perfect lawnmower grid pattern inside authorized geofence.
        Epoch 12+: Sub-threshold 0.35 m/s pseudorange drift steers drone 45+ meters off-track
        outside the geofence into a hazardous crane/chemical facility.
        """
        attack_start = 12
        spoofer_loc = [18.955, 72.978]
        center_lat, center_lon = 18.960, 72.970

        epochs_data = []
        for t in range(total_epochs):
            # Lawnmower pattern
            row = t // 15
            sub_t = t % 15
            dir_x = 1 if row % 2 == 0 else -1

            cur_lat = center_lat + row * 0.0015
            cur_lon = center_lon + dir_x * (sub_t - 7.5) * 0.0004
            alt = 120.0
            speed = 8.0  # m/s (~15.5 knots)
            heading = 90.0 if dir_x == 1 else 270.0

            if t < attack_start:
                s_lat, s_lon = cur_lat, cur_lon
                rec_lat, rec_lon = cur_lat, cur_lon
                is_attack = False
                cn0 = 44.0 + np.sin(t * 0.3) * 0.8
                agc = -86.0
                doa_var = 1.38
                violation = None
                alert = None
            else:
                is_attack = True
                prog = (t - attack_start) / (total_epochs - attack_start)
                # Spoofer introduces cumulative drift toward northeast industrial crane zone
                drift_lat = prog * 0.0045  # ~50 meters drift
                drift_lon = prog * 0.0045
                s_lat = cur_lat + drift_lat
                s_lon = cur_lon + drift_lon

                # EKF visual odometry + IMU detects drift
                rec_lat = cur_lat + prog * 0.00008
                rec_lon = cur_lon + prog * 0.00008

                cn0 = 43.0 + np.random.normal(0, 0.9)  # Stealthy matched-power!
                agc = -83.0 + np.random.normal(0, 1.2)
                doa_var = 0.045

                if t >= 28:
                    violation = "UAV_GEOFENCE_BREACH"
                    alert = "🚨 UAV INTEGRITY CRITICAL: GEOFENCE BREACH DETECTED — DRIFT-EVASIVE SPOOFING 🚨"
                else:
                    violation = "CUMULATIVE_SUB_THRESHOLD_DRIFT"
                    alert = "⚠️ Sub-threshold Pseudorange Drift: Innovation Exceeds Gate"

            drift_m = haversine_distance_m([cur_lat, cur_lon], [s_lat, s_lon])

            epochs_data.append({
                "epoch": t,
                "true_pos": [round(cur_lat, 6), round(cur_lon, 6)],
                "spoofed_pos": [round(s_lat, 6), round(s_lon, 6)],
                "ekf_pos": [round(rec_lat, 6), round(rec_lon, 6)],
                "altitude_m": round(alt, 1),
                "speed": round(speed, 1),
                "speed_unit": "m/s",
                "heading_deg": round(heading, 1),
                "inferred_cn0": round(cn0, 1),
                "agc_attenuation_db": round(agc, 1),
                "doa_azimuth_var": round(doa_var, 4),
                "position_drift_m": round(drift_m, 1),
                "is_attack_active": is_attack,
                "gis_violation": violation,
                "alert_message": alert,
            })

        geofence_poly = [
            [18.958, 72.965],
            [18.968, 72.965],
            [18.968, 72.975],
            [18.958, 72.975],
            [18.958, 72.965],
        ]

        prohibited_zone = [
            [18.966, 72.976],
            [18.972, 72.976],
            [18.972, 72.982],
            [18.966, 72.982],
            [18.966, 72.976],
        ]

        return {
            "scenario_id": "uav_drift",
            "domain": "uav",
            "title": "UAV Drone: Reinforcement Learning Drift-Evasive Attack",
            "target_vehicle": "Hexacopter Photogrammetry & LiDAR Drone",
            "vehicle_type": "drone",
            "location_name": "Navi Mumbai Coastal Infrastructure / Industrial Geofence",
            "map_center": [18.963, 72.972],
            "default_zoom": 15,
            "attack_start_epoch": attack_start,
            "spoofer_location": spoofer_loc,
            "narrative_phases": [
                {"phase": 1, "epochs": "0-11", "title": "Grid Photogrammetry Survey", "desc": "Hexacopter conducting precision lawnmower grid within 120m geofence."},
                {"phase": 2, "epochs": "12-27", "title": "Sub-Threshold Drift Slewing", "desc": "Adversary injects 0.35 m/s pseudorange drift bypassing instantaneous RAIM."},
                {"phase": 3, "epochs": "28-59", "title": "Geofence Escape & Spatial Hazard", "desc": "Cumulative 45m drift pushes drone into high-risk industrial facility."}
            ],
            "gis_polygons": [
                {"name": "Authorized Aerial Survey Geofence", "coords": geofence_poly, "color": "#06b6d4", "type": "GEOFENCE"},
                {"name": "Prohibited Industrial Crane Zone", "coords": prohibited_zone, "color": "#ef4444", "type": "RESTRICTED"}
            ],
            "epochs": epochs_data,
        }

    def generate_agri_tractor(self, total_epochs: int = 60) -> Dict[str, Any]:
        """
        Scenario 4: Precision Agriculture (Nashik Vineyard RTK Tractor Row Deviation).
        Autonomous tractor weeding high-value grapevines with centimeter-accuracy RTK.
        Epoch 0-13: Centered in vine furrow.
        Epoch 14+: Spoofer injects 2.8m lateral step (exceeding 25cm tolerance),
        driving tractor across vines.
        """
        attack_start = 14
        spoofer_loc = [20.013, 73.794]
        base_lat, base_lon = 20.010, 73.790

        epochs_data = []
        for t in range(total_epochs):
            cur_lat = base_lat + t * 0.00005  # Moving North along furrow at ~1.5 m/s
            cur_lon = base_lon

            if t < attack_start:
                s_lat, s_lon = cur_lat, cur_lon
                rec_lat, rec_lon = cur_lat, cur_lon
                is_attack = False
                cn0 = 45.0 + np.sin(t * 0.2) * 0.5
                agc = -85.5
                doa_var = 1.40
                violation = None
                alert = None
            else:
                is_attack = True
                prog = (t - attack_start) / (total_epochs - attack_start)
                # 2.8m lateral coordinate step to East
                lateral_offset = 0.000028  # ~2.8 meters
                s_lat = cur_lat
                s_lon = cur_lon + lateral_offset

                # EKF wheel odometry rejects lateral jump
                rec_lat = cur_lat
                rec_lon = cur_lon + 0.000001

                cn0 = 47.0 + np.random.normal(0, 0.8)
                agc = -65.0 + np.random.normal(0, 1.0)
                doa_var = 0.02

                if t >= 20:
                    violation = "ROW_BOUNDARY_BREACH"
                    alert = "🚨 AUTONOMOUS TRACTOR EMERGENCY STOP: CROP ROW COLLISION HAZARD (XTE > 0.25m) 🚨"
                else:
                    violation = "RTK_PHASE_STEP"
                    alert = "⚠️ RTK Carrier Phase Discontinuity Detected"

            drift_m = haversine_distance_m([cur_lat, cur_lon], [s_lat, s_lon])

            epochs_data.append({
                "epoch": t,
                "true_pos": [round(cur_lat, 6), round(cur_lon, 6)],
                "spoofed_pos": [round(s_lat, 6), round(s_lon, 6)],
                "ekf_pos": [round(rec_lat, 6), round(rec_lon, 6)],
                "altitude_m": 580.0,
                "speed": 5.4,  # km/h
                "speed_unit": "km/h",
                "heading_deg": 0.0,
                "inferred_cn0": round(cn0, 1),
                "agc_attenuation_db": round(agc, 1),
                "doa_azimuth_var": round(doa_var, 4),
                "position_drift_m": round(drift_m, 2),
                "is_attack_active": is_attack,
                "gis_violation": violation,
                "alert_message": alert,
            })

        crop_row_1 = [
            [20.009, 73.7899],
            [20.014, 73.7899],
            [20.014, 73.7901],
            [20.009, 73.7901],
            [20.009, 73.7899],
        ]

        crop_row_2 = [
            [20.009, 73.79025],
            [20.014, 73.79025],
            [20.014, 73.79045],
            [20.009, 73.79045],
            [20.009, 73.79025],
        ]

        return {
            "scenario_id": "agri_tractor",
            "domain": "agriculture",
            "title": "Precision Agriculture: Nashik Vineyard RTK Tractor",
            "target_vehicle": "Autonomous RTK Weeding Tractor (Autosteer)",
            "vehicle_type": "tractor",
            "location_name": "Nashik Precision Viticulture Parcel (Vineyard Furrows)",
            "map_center": [20.011, 73.790],
            "default_zoom": 18,
            "attack_start_epoch": attack_start,
            "spoofer_location": spoofer_loc,
            "narrative_phases": [
                {"phase": 1, "epochs": "0-13", "title": "Precision Row Weeding", "desc": "Tractor centered in vine furrow using dual-freq RTK GNSS autosteer."},
                {"phase": 2, "epochs": "14-19", "title": "Receiver-Aware Phase Step", "desc": "Adversary injects stealthy 2.8m lateral offset into RTK corrections."},
                {"phase": 3, "epochs": "20-59", "title": "Row Breach & Autosteer E-Stop", "desc": "Cross-track error exceeds 25cm. AEGIS triggers immediate autosteer lockout."}
            ],
            "gis_polygons": [
                {"name": "Vine Row 4 (Sauvignon Blanc)", "coords": crop_row_1, "color": "#10b981", "type": "CORRIDOR"},
                {"name": "Vine Row 5 (Crop Collision Risk)", "coords": crop_row_2, "color": "#ef4444", "type": "RESTRICTED"}
            ],
            "epochs": epochs_data,
        }

    def generate_all_and_save(self) -> Dict[str, str]:
        """Generates all 4 scenarios and saves them as JSON files in data/."""
        scenarios = {
            "aviation_vilnius": self.generate_aviation_vilnius(),
            "maritime_baltic": self.generate_maritime_baltic(),
            "uav_drift": self.generate_uav_drift(),
            "agri_tractor": self.generate_agri_tractor(),
        }

        saved_paths = {}
        for sc_id, sc_data in scenarios.items():
            out_file = self.output_dir / f"{sc_id}.json"
            out_file.write_text(json.dumps(sc_data, indent=2), encoding="utf-8")
            saved_paths[sc_id] = str(out_file)
            print(f"[ENGINE] Generated {sc_id:<18} -> {out_file} ({len(sc_data['epochs'])} epochs)")

        return saved_paths


# Singleton instance
scenario_engine = GlobalScenarioEngine()


def get_all_simulation_tracks() -> List[Dict[str, Any]]:
    """Returns metadata for all 4 scenarios."""
    return [
        {
            "id": "aviation_vilnius",
            "title": "Aviation: Ryanair Vilnius Approach (EASA Alert 2025)",
            "domain": "aviation",
            "vehicle_type": "airplane",
            "icon": "Plane",
            "location": "Vilnius International Airport (EYVI)",
        },
        {
            "id": "maritime_baltic",
            "title": "Maritime: Baltic Sea Tanker Runway Teleport (C4ADS)",
            "domain": "maritime",
            "vehicle_type": "ship",
            "icon": "Ship",
            "location": "Baltic Sea approaching Gdańsk",
        },
        {
            "id": "uav_drift",
            "title": "UAV Drone: Reinforcement Learning Drift-Evasive Attack",
            "domain": "uav",
            "vehicle_type": "drone",
            "icon": "Navigation",
            "location": "Navi Mumbai Coastal Industrial Facility",
        },
        {
            "id": "agri_tractor",
            "title": "Precision Agriculture: Nashik Vineyard RTK Tractor",
            "domain": "agriculture",
            "vehicle_type": "tractor",
            "icon": "Tractor",
            "location": "Nashik Precision Viticulture Parcel",
        },
    ]


def get_simulation_track(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full simulation track data by scenario ID."""
    valid_ids = {"aviation_vilnius", "maritime_baltic", "uav_drift", "agri_tractor"}
    data_file = scenario_engine.output_dir / f"{scenario_id}.json"
    if data_file.exists():
        return json.loads(data_file.read_text(encoding="utf-8"))

    if scenario_id not in valid_ids:
        return None

    # Fallback to dynamic generation
    if scenario_id == "aviation_vilnius":
        return scenario_engine.generate_aviation_vilnius()
    elif scenario_id == "uav_drift":
        return scenario_engine.generate_uav_drift()
    elif scenario_id == "agri_tractor":
        return scenario_engine.generate_agri_tractor()
    elif scenario_id == "maritime_baltic":
        return scenario_engine.generate_maritime_baltic()
    return None


if __name__ == "__main__":
    scenario_engine.generate_all_and_save()
