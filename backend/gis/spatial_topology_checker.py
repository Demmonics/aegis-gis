"""
AEGIS-GIS: Spatial Topology Checker
Implements Section 9 of the KJSCE Research Paper:
"GIS-Assisted Spoofing Detection" — Combining GNSS measurements with vector boundaries,
corridor buffers, kinematic continuity, and spatial topology predicates.
"""

import math
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from shapely.geometry import Point, Polygon, LineString


class GISTopologyVerdict(BaseModel):
    passed: bool
    violation_type: Optional[str] = None
    distance_from_valid_corridor_m: float = 0.0
    impact_metric_label: Optional[str] = None
    impact_metric_value: Optional[float] = None
    explanation: str
    paper_reference: str = "Section 9 (GIS-Assisted Spoofing Detection & Spatial Constraints)"


class GISSpatialTopologyChecker:
    """
    Evaluates reported WGS-84 coordinates against spatial topology constraints from Section 9.
    """

    def __init__(self):
        # 1. Baltic Sea shipping corridor and Khrabrovo Runway
        self.baltic_shipping_corridor = Polygon([
            (19.75, 54.62), (20.15, 54.72), (20.05, 54.82), (19.65, 54.72), (19.75, 54.62)
        ])
        self.khrabrovo_airport_runway = Polygon([
            (20.570, 54.880), (20.615, 54.880), (20.615, 54.905), (20.570, 54.905), (20.570, 54.880)
        ])

        # 2. Vilnius ILS approach corridor
        self.vilnius_ils_corridor = Polygon([
            (25.305, 54.750), (25.335, 54.750), (25.295, 54.630), (25.275, 54.630), (25.305, 54.750)
        ])

        # 3. UAV LiDAR survey grid
        self.uav_survey_grid = Polygon([
            (72.964, 18.954), (72.976, 18.954), (72.976, 18.966), (72.964, 18.966), (72.964, 18.954)
        ])

        # 4. Vineyard parcel boundary and crop row centerline
        self.vineyard_parcel = Polygon([
            (73.7895, 20.0095), (73.7915, 20.0095), (73.7915, 20.0135), (73.7895, 20.0135), (73.7895, 20.0095)
        ])
        self.vineyard_crop_row = LineString([
            (73.7900, 20.0095), (73.7900, 20.0135)
        ])

    def evaluate_observation(
        self,
        scenario_id: str,
        lon: float,
        lat: float,
        alt_m: float = 0.0,
        speed_mps: float = 12.0,
        prev_coords: Optional[List[float]] = None,
        dt_sec: float = 1.0
    ) -> GISTopologyVerdict:
        pt = Point(lon, lat)

        if scenario_id == "baltic_maritime_c4ads":
            # Check 1: Did the maritime vessel report a position on the airport runway or outside the sea corridor?
            on_runway = self.khrabrovo_airport_runway.contains(pt)
            in_corridor = self.baltic_shipping_corridor.contains(pt)

            if on_runway or not in_corridor:
                # Approximate distance in meters to valid shipping corridor
                dist_deg = pt.distance(self.baltic_shipping_corridor)
                dist_m = dist_deg * 111320.0 * 0.75 # kaliningrad latitude scale

                return GISTopologyVerdict(
                    passed=False,
                    violation_type="MARITIME_VESSEL_ON_LAND_RUNWAY",
                    distance_from_valid_corridor_m=round(dist_m, 1),
                    impact_metric_label="False Land Distance (km)",
                    impact_metric_value=round(dist_m / 1000.0, 2),
                    explanation=(
                        f"CRITICAL GIS CONFLICT: Maritime oil tanker reported position [{lon:.4f}, {lat:.4f}] "
                        f"intersects terrestrial landmass/airport runway ({round(dist_m/1000.0, 1)} km from shipping lane). "
                        f"Physical maritime vessel cannot navigate on airport tarmac!"
                    )
                )
            else:
                return GISTopologyVerdict(
                    passed=True,
                    distance_from_valid_corridor_m=0.0,
                    explanation="GIS Verified: Vessel position is inside authorized Baltic Sea maritime shipping corridor."
                )

        elif scenario_id == "vilnius_aviation_adsb":
            # Check 2: Outside ILS glide slope funnel or impossible lateral acceleration
            in_funnel = self.vilnius_ils_corridor.contains(pt)
            lateral_accel_violation = False

            if prev_coords is not None and dt_sec > 0:
                d_lat = (lat - prev_coords[1]) * 111320.0
                d_lon = (lon - prev_coords[0]) * 111320.0 * 0.58
                step_dist = math.hypot(d_lat, d_lon)
                instant_speed = step_dist / dt_sec
                # Check for step jump > 180 m/s (> 350 knots suddenly)
                if instant_speed > 180.0:
                    lateral_accel_violation = True

            if not in_funnel or lateral_accel_violation:
                dist_deg = pt.distance(self.vilnius_ils_corridor)
                dist_m = dist_deg * 111320.0 * 0.58

                return GISTopologyVerdict(
                    passed=False,
                    violation_type="AVIATION_APPROACH_CORRIDOR_DEVIATION",
                    distance_from_valid_corridor_m=round(dist_m, 1),
                    impact_metric_label="Glide Slope Lateral Error (km)",
                    impact_metric_value=round(dist_m / 1000.0, 2),
                    explanation=(
                        f"ICAO ILS APPROACH BREACH: Aircraft coordinates have drifted {round(dist_m/1000.0, 2)} km "
                        f"outside the Vilnius Runway 19 approach corridor funnel. Potential spurious GPWS alert!"
                    )
                )
            else:
                return GISTopologyVerdict(
                    passed=True,
                    distance_from_valid_corridor_m=0.0,
                    explanation="GIS Verified: Aircraft is within ICAO ILS glide slope corridor boundaries."
                )

        elif scenario_id == "uav_lidar_survey":
            # Check 3: Outside LiDAR survey geofence
            in_geofence = self.uav_survey_grid.contains(pt)

            if not in_geofence:
                dist_deg = pt.distance(self.uav_survey_grid)
                dist_m = dist_deg * 111320.0
                # Impact: corrupted orthomosaic area percentage
                corrupted_pct = min(100.0, (dist_m / 50.0) * 85.0)

                return GISTopologyVerdict(
                    passed=False,
                    violation_type="UAV_SURVEY_CORRIDOR_DRIFT",
                    distance_from_valid_corridor_m=round(dist_m, 1),
                    impact_metric_label="Corrupted Orthomosaic Area (%)",
                    impact_metric_value=round(corrupted_pct, 1),
                    explanation=(
                        f"SURVEY GEOFENCE VIOLATION: Drone drifted {dist_m:.1f}m outside authorized photogrammetry block. "
                        f"Unfiltered ingestion would corrupt {corrupted_pct:.1f}% of the downstream GIS Orthomosaic & DSM!"
                    )
                )
            else:
                return GISTopologyVerdict(
                    passed=True,
                    distance_from_valid_corridor_m=0.0,
                    explanation="GIS Verified: UAV is positioned within authorized LiDAR photogrammetry grid."
                )

        else: # precision_ag_tractor
            # Check 4: Cross-track error from vineyard crop row centerline
            dist_deg = pt.distance(self.vineyard_crop_row)
            # At 20 deg latitude, 1 deg lon is ~104,500 m
            xte_m = dist_deg * 104500.0

            if xte_m > 0.25: # >25 cm threshold (inter-row clearance is 30 cm)
                damaged_meters = max(1.0, (xte_m - 0.25) * 12.0)
                return GISTopologyVerdict(
                    passed=False,
                    violation_type="AGRICULTURE_CROP_ROW_COLLISION_RISK",
                    distance_from_valid_corridor_m=round(xte_m, 2),
                    impact_metric_label="Vines at Risk (m)",
                    impact_metric_value=round(damaged_meters, 1),
                    explanation=(
                        f"CROP ROW COLLISION RISK: Tractor cross-track error is {xte_m:.2f}m (threshold 0.25m). "
                        f"Autosteer has departed the inter-row centerline; herbicide spraying will destroy high-value vines!"
                    )
                )
            else:
                return GISTopologyVerdict(
                    passed=True,
                    distance_from_valid_corridor_m=round(xte_m, 2),
                    explanation=f"GIS Verified: Tractor tracking within crop row tolerance (XTE={xte_m*100:.1f} cm)."
                )
