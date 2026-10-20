"""
AEGIS-GIS Physics Engine
WGS-84 / ECEF / UTM coordinate math, GNSS RF correlator & pseudorange physics simulator,
and the 4 real-world GNSS spoofing incident scenarios from Section 5 of the research paper.
"""

from .coordinates import (
    geodetic_to_ecef,
    ecef_to_geodetic,
    geodetic_to_utm,
    solve_wls_pvt,
)
from .signal_simulator import (
    SpoofingAttackType,
    GNSSSignalSimulator,
    EpochTelemetry,
    CorrelatorTaps,
    SatelliteState,
)
from .scenarios import (
    ScenarioManager,
    ScenarioMetadata,
    ScenarioRun,
    get_all_scenarios,
    run_scenario,
)

__all__ = [
    "geodetic_to_ecef",
    "ecef_to_geodetic",
    "geodetic_to_utm",
    "solve_wls_pvt",
    "SpoofingAttackType",
    "GNSSSignalSimulator",
    "EpochTelemetry",
    "CorrelatorTaps",
    "SatelliteState",
    "ScenarioManager",
    "ScenarioMetadata",
    "ScenarioRun",
    "get_all_scenarios",
    "run_scenario",
]
