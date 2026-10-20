"""
AEGIS-GIS: GNSS RF Correlator & Pseudorange Physics Simulator
Implements Sections 3 & 4.2 of the KJSCE Research Paper:
- 7 Attack Classes (AUTHENTIC + 6 Spoofing Types)
- 41-Tap RF Correlator Peak Triangle Generator (Early-Prompt-Late distortion)
- 14 Telemetry Features matching Section 6.5
- Multi-Constellation Satellite Skyplot Tracker (GPS, Galileo, GLONASS, NavIC, BeiDou)
"""

import math
import random
from enum import Enum
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field
import numpy as np

C_LIGHT = 299792458.0
GPS_L1_FREQ_HZ = 1575.42e6
GPS_L1_WAVELENGTH_M = C_LIGHT / GPS_L1_FREQ_HZ


class SpoofingAttackType(str, Enum):
    AUTHENTIC = "AUTHENTIC"
    SIMPLISTIC_NON_SYNC = "SIMPLISTIC_NON_SYNC"
    INTERMEDIATE_SYNC = "INTERMEDIATE_SYNC"
    SOPHISTICATED_RECEIVER_AWARE = "SOPHISTICATED_RECEIVER_AWARE"
    MEACONING = "MEACONING"
    NULLING_SUPPRESSION = "NULLING_SUPPRESSION"
    DRIFT_EVASIVE_UAV = "DRIFT_EVASIVE_UAV"


class CorrelatorTaps(BaseModel):
    delays_chips: List[float] = Field(description="Delay offsets in chips from -2.0 to +2.0")
    authentic_profile: List[float] = Field(description="Ideal authentic correlation triangle")
    spoofer_profile: List[float] = Field(description="Injected spoofer correlation triangle")
    composite_profile: List[float] = Field(description="Total composite distorted correlation envelope")
    early_tap: float
    prompt_tap: float
    late_tap: float
    ratio_metric: float
    delta_asymmetry: float


class SatelliteState(BaseModel):
    prn: str
    constellation: str
    azimuth_deg: float
    elevation_deg: float
    cn0_dbhz: float
    pseudorange_m: float
    pseudorange_residual_m: float
    doppler_hz: float
    osnma_authenticated: bool
    is_spoofed_satellite: bool


class EpochTelemetry(BaseModel):
    epoch: int
    timestamp_sec: float
    attack_type: SpoofingAttackType
    features_14d: Dict[str, float]
    feature_vector: List[float]
    correlator_taps: CorrelatorTaps
    satellites: List[SatelliteState]
    reported_lat: float
    reported_lon: float
    reported_alt: float
    true_lat: float
    true_lon: float
    true_alt: float
    clock_bias_m: float
    reported_speed_mps: float
    ground_truth_speed_mps: float


class GNSSSignalSimulator:
    """
    High-fidelity GNSS RF & Pseudorange Physics Simulator.
    Simulates genuine satellite orbits, correlator tap triangles, multi-antenna arrival angles,
    and the distinct RF/kinematic signatures of all 6 spoofing attacks from Section 4.2.
    """

    FEATURE_KEYS = [
        "cn0_mean_dbhz",
        "cn0_moving_variance",
        "sqm_ratio_metric",
        "sqm_delta_asymmetry",
        "clock_bias_jump_m",
        "clock_drift_mps",
        "pseudorange_residual_rms",
        "doppler_pseudorange_rate_diff",
        "carrier_phase_slip_ratio",
        "agc_gain_level_db",
        "doa_azimuth_variance_deg",
        "ekf_innovation_mahalanobis",
        "cumulative_drift_cusum",
        "pdop_dilution"
    ]

    def __init__(self, seed: Optional[int] = 42):
        self.rng = np.random.default_rng(seed)
        self.prev_clock_bias_m = 0.0
        self.cn0_history: List[float] = []
        self.cusum_drift = 0.0

        # Canonical visible multi-constellation satellites
        self.base_satellites = [
            {"prn": "G01", "constellation": "GPS", "az": 42.0, "el": 68.0, "cn0": 44.5},
            {"prn": "G08", "constellation": "GPS", "az": 128.0, "el": 45.0, "cn0": 43.8},
            {"prn": "G14", "constellation": "GPS", "az": 215.0, "el": 34.0, "cn0": 42.1},
            {"prn": "G27", "constellation": "GPS", "az": 305.0, "el": 55.0, "cn0": 45.0},
            {"prn": "E05", "constellation": "Galileo", "az": 85.0, "el": 62.0, "cn0": 46.2},
            {"prn": "E11", "constellation": "Galileo", "az": 175.0, "el": 41.0, "cn0": 44.0},
            {"prn": "E24", "constellation": "Galileo", "az": 260.0, "el": 52.0, "cn0": 45.5},
            {"prn": "R04", "constellation": "GLONASS", "az": 15.0, "el": 38.0, "cn0": 42.6},
            {"prn": "C09", "constellation": "BeiDou", "az": 140.0, "el": 71.0, "cn0": 44.8},
            {"prn": "I01", "constellation": "NavIC", "az": 190.0, "el": 59.0, "cn0": 43.5},
        ]

    def reset(self):
        self.prev_clock_bias_m = 0.0
        self.cn0_history.clear()
        self.cusum_drift = 0.0

    def generate_correlator_profile(
        self,
        attack_type: SpoofingAttackType,
        spoofer_delay_chips: float = 0.35,
        spoofer_power_ratio: float = 1.4,
        phase_offset_rad: float = 0.2
    ) -> CorrelatorTaps:
        """
        Generate 41 correlator delay taps from -2.0 chips to +2.0 chips.
        Computes authentic triangle, spoofer triangle, and composite sum.
        """
        taps = np.linspace(-2.0, 2.0, 41)
        auth_profile = np.maximum(0.0, 1.0 - np.abs(taps))

        if attack_type == SpoofingAttackType.AUTHENTIC:
            spoofer_profile = np.zeros_like(taps)
            noise = self.rng.normal(0.0, 0.02, size=len(taps))
            composite = np.clip(auth_profile + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.SIMPLISTIC_NON_SYNC:
            # Unsynchronized high-power signal offset in code phase
            spoofer_profile = spoofer_power_ratio * 1.8 * np.maximum(0.0, 1.0 - np.abs(taps - spoofer_delay_chips))
            noise = self.rng.normal(0.0, 0.04, size=len(taps))
            composite = np.clip(np.maximum(auth_profile, spoofer_profile) + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.INTERMEDIATE_SYNC:
            # Code-phase pull-off with peak overlap causing characteristic asymmetry
            spoofer_profile = spoofer_power_ratio * np.maximum(0.0, 1.0 - np.abs(taps - spoofer_delay_chips))
            i_comp = auth_profile + spoofer_profile * math.cos(phase_offset_rad)
            q_comp = spoofer_profile * math.sin(phase_offset_rad)
            noise = self.rng.normal(0.0, 0.02, size=len(taps))
            composite = np.clip(np.sqrt(i_comp**2 + q_comp**2) + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.SOPHISTICATED_RECEIVER_AWARE:
            # Power-matched signal closely hugging prompt
            spoofer_profile = 1.05 * np.maximum(0.0, 1.0 - np.abs(taps - 0.12))
            noise = self.rng.normal(0.0, 0.02, size=len(taps))
            composite = np.clip(auth_profile + 0.15 * spoofer_profile + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.MEACONING:
            # Rebroadcast replica with time delay
            spoofer_profile = 1.2 * np.maximum(0.0, 1.0 - np.abs(taps - 0.8))
            noise = self.rng.normal(0.0, 0.03, size=len(taps))
            composite = np.clip(auth_profile + spoofer_profile + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.NULLING_SUPPRESSION:
            # Authentic suppressed by antipodal carrier
            suppressed_auth = np.maximum(0.0, auth_profile * 0.25)
            spoofer_profile = 1.1 * np.maximum(0.0, 1.0 - np.abs(taps - spoofer_delay_chips))
            noise = self.rng.normal(0.0, 0.03, size=len(taps))
            composite = np.clip(suppressed_auth + spoofer_profile + noise, 0.0, None)
        elif attack_type == SpoofingAttackType.DRIFT_EVASIVE_UAV:
            # Micro code phase drift (delta tau ~ 0.08 chips)
            spoofer_profile = 1.02 * np.maximum(0.0, 1.0 - np.abs(taps - 0.08))
            noise = self.rng.normal(0.0, 0.015, size=len(taps))
            composite = np.clip(auth_profile * 0.9 + spoofer_profile * 0.12 + noise, 0.0, None)
        else:
            spoofer_profile = np.zeros_like(taps)
            composite = auth_profile.copy()

        # Extract Early (-0.5 chips), Prompt (0.0 chips), Late (+0.5 chips)
        idx_early = int(np.argmin(np.abs(taps - (-0.5))))
        idx_prompt = int(np.argmin(np.abs(taps - 0.0)))
        idx_late = int(np.argmin(np.abs(taps - (+0.5))))

        e_val = float(composite[idx_early])
        p_val = max(float(composite[idx_prompt]), 0.05)
        l_val = float(composite[idx_late])

        ratio_metric = float((e_val + l_val) / p_val)
        delta_asym = float((e_val - l_val) / (2.0 * p_val))

        return CorrelatorTaps(
            delays_chips=[round(float(t), 2) for t in taps],
            authentic_profile=[round(float(v), 4) for v in auth_profile],
            spoofer_profile=[round(float(v), 4) for v in spoofer_profile],
            composite_profile=[round(float(v), 4) for v in composite],
            early_tap=round(e_val, 4),
            prompt_tap=round(p_val, 4),
            late_tap=round(l_val, 4),
            ratio_metric=round(ratio_metric, 4),
            delta_asymmetry=round(delta_asym, 4),
        )

    def generate_epoch_telemetry(
        self,
        epoch: int,
        attack_type: SpoofingAttackType,
        true_lat: float,
        true_lon: float,
        true_alt: float = 15.0,
        spoofed_lat: Optional[float] = None,
        spoofed_lon: Optional[float] = None,
        spoofed_alt: Optional[float] = None,
        spoofer_power_advantage_db: float = 3.0,
    ) -> EpochTelemetry:
        """
        Generate a complete 14-dimensional telemetry record for epoch t.
        """
        reported_lat = spoofed_lat if spoofed_lat is not None else true_lat
        reported_lon = spoofed_lon if spoofed_lon is not None else true_lon
        reported_alt = spoofed_alt if spoofed_alt is not None else true_alt

        is_spoofed = (attack_type != SpoofingAttackType.AUTHENTIC)

        # Baseline noise and physical attributes per attack type
        if attack_type == SpoofingAttackType.AUTHENTIC:
            cn0_mean = float(self.rng.normal(44.2, 0.8))
            cn0_var = float(self.rng.uniform(0.15, 0.85))
            sqm_ratio = float(self.rng.normal(1.02, 0.03))
            sqm_delta = float(self.rng.normal(0.01, 0.02))
            clock_bias_jump = float(self.rng.normal(0.0, 1.2))
            clock_drift = float(self.rng.normal(0.02, 0.05))
            pseudorange_rms = float(self.rng.uniform(0.8, 2.2))
            doppler_pr_rate_diff = float(self.rng.uniform(0.05, 0.35))
            cycle_slip_ratio = float(self.rng.choice([0.0, 0.02], p=[0.92, 0.08]))
            agc_gain = float(self.rng.normal(38.0, 1.0))
            doa_az_var = float(self.rng.uniform(55.0, 85.0))
            ekf_innov = float(self.rng.uniform(0.5, 2.8))
            drift_cusum_increment = 0.0
            pdop = float(self.rng.uniform(1.3, 1.9))

        elif attack_type == SpoofingAttackType.SIMPLISTIC_NON_SYNC:
            # Overpowering non-synchronized spoofer
            cn0_mean = float(self.rng.normal(54.5 + spoofer_power_advantage_db * 0.5, 1.2))
            cn0_var = float(self.rng.uniform(6.5, 14.0))
            sqm_ratio = float(self.rng.normal(1.48, 0.08))
            sqm_delta = float(self.rng.normal(0.38, 0.06))
            clock_bias_jump = float(self.rng.uniform(280.0, 650.0))
            clock_drift = float(self.rng.uniform(12.0, 45.0))
            pseudorange_rms = float(self.rng.uniform(22.0, 65.0))
            doppler_pr_rate_diff = float(self.rng.uniform(15.0, 48.0))
            cycle_slip_ratio = float(self.rng.uniform(0.35, 0.75))
            agc_gain = float(self.rng.normal(21.0, 1.5)) # AGC drops sharply due to high RF power
            doa_az_var = float(self.rng.uniform(1.2, 4.8)) # All signals from 1 ground antenna
            ekf_innov = float(self.rng.uniform(45.0, 180.0))
            drift_cusum_increment = 5.0
            pdop = float(self.rng.uniform(2.5, 4.2))

        elif attack_type == SpoofingAttackType.INTERMEDIATE_SYNC:
            # Early-Late peak distortion with moderate power advantage
            cn0_mean = float(self.rng.normal(47.8 + spoofer_power_advantage_db * 0.3, 0.9))
            cn0_var = float(self.rng.uniform(2.8, 6.2))
            sqm_ratio = float(self.rng.normal(1.28, 0.05))
            sqm_delta = float(self.rng.normal(-0.32, 0.05)) # Distinct asymmetric peak distortion
            clock_bias_jump = float(self.rng.uniform(15.0, 45.0))
            clock_drift = float(self.rng.uniform(1.8, 5.5))
            pseudorange_rms = float(self.rng.uniform(5.5, 14.0))
            doppler_pr_rate_diff = float(self.rng.uniform(2.8, 7.5))
            cycle_slip_ratio = float(self.rng.uniform(0.12, 0.28))
            agc_gain = float(self.rng.normal(32.0, 1.2))
            doa_az_var = float(self.rng.uniform(4.5, 11.0))
            ekf_innov = float(self.rng.uniform(16.0, 42.0))
            drift_cusum_increment = 2.5
            pdop = float(self.rng.uniform(1.6, 2.4))

        elif attack_type == SpoofingAttackType.SOPHISTICATED_RECEIVER_AWARE:
            # Multi-antenna, power-matched; defeats SQM & DoA, caught by EKF & GIS!
            cn0_mean = float(self.rng.normal(44.8, 0.8))
            cn0_var = float(self.rng.uniform(0.9, 1.8))
            sqm_ratio = float(self.rng.normal(1.06, 0.04))
            sqm_delta = float(self.rng.normal(0.04, 0.03))
            clock_bias_jump = float(self.rng.uniform(3.0, 8.5))
            clock_drift = float(self.rng.uniform(0.4, 1.2))
            pseudorange_rms = float(self.rng.uniform(2.4, 4.5))
            doppler_pr_rate_diff = float(self.rng.uniform(0.8, 1.8))
            cycle_slip_ratio = float(self.rng.uniform(0.02, 0.06))
            agc_gain = float(self.rng.normal(37.5, 1.0))
            doa_az_var = float(self.rng.uniform(48.0, 72.0)) # Mimics spatial geometry
            ekf_innov = float(self.rng.uniform(18.5, 38.0)) # Innovations diverge against IMU!
            drift_cusum_increment = 1.2
            pdop = float(self.rng.uniform(1.4, 2.0))

        elif attack_type == SpoofingAttackType.MEACONING:
            # Genuine signal rebroadcast with propagation delay tau
            cn0_mean = float(self.rng.normal(46.0, 1.1))
            cn0_var = float(self.rng.uniform(1.8, 4.2))
            sqm_ratio = float(self.rng.normal(1.15, 0.05))
            sqm_delta = float(self.rng.normal(0.12, 0.04))
            clock_bias_jump = float(self.rng.uniform(210.0, 450.0)) # Universal common-mode clock bias jump
            clock_drift = float(self.rng.uniform(3.5, 9.0))
            pseudorange_rms = float(self.rng.uniform(8.0, 20.0))
            doppler_pr_rate_diff = float(self.rng.uniform(4.0, 12.0))
            cycle_slip_ratio = float(self.rng.uniform(0.15, 0.35))
            agc_gain = float(self.rng.normal(34.0, 1.2))
            doa_az_var = float(self.rng.uniform(2.5, 7.0)) # Rebroadcast from single terrestrial repeater
            ekf_innov = float(self.rng.uniform(28.0, 75.0))
            drift_cusum_increment = 3.8
            pdop = float(self.rng.uniform(1.5, 2.2))

        elif attack_type == SpoofingAttackType.NULLING_SUPPRESSION:
            # Antipodal carrier nulling drops C/N0 before injecting spoof
            cn0_mean = float(self.rng.normal(34.5, 1.5)) # Massive C/N0 drop
            cn0_var = float(self.rng.uniform(5.5, 11.0))
            sqm_ratio = float(self.rng.normal(1.35, 0.07))
            sqm_delta = float(self.rng.normal(-0.25, 0.06))
            clock_bias_jump = float(self.rng.uniform(60.0, 160.0))
            clock_drift = float(self.rng.uniform(6.0, 18.0))
            pseudorange_rms = float(self.rng.uniform(14.0, 32.0))
            doppler_pr_rate_diff = float(self.rng.uniform(8.0, 22.0))
            cycle_slip_ratio = float(self.rng.uniform(0.55, 0.90))
            agc_gain = float(self.rng.normal(48.0, 2.0)) # AGC maximum amplification seeking dead signal
            doa_az_var = float(self.rng.uniform(3.0, 8.5))
            ekf_innov = float(self.rng.uniform(32.0, 85.0))
            drift_cusum_increment = 4.2
            pdop = float(self.rng.uniform(2.2, 3.8))

        elif attack_type == SpoofingAttackType.DRIFT_EVASIVE_UAV:
            # Panda & Guo 2025: Sub-threshold drift evading instantaneous RAIM
            cn0_mean = float(self.rng.normal(43.9, 0.6))
            cn0_var = float(self.rng.uniform(0.4, 1.1))
            sqm_ratio = float(self.rng.normal(1.04, 0.03))
            sqm_delta = float(self.rng.normal(-0.06, 0.02))
            clock_bias_jump = float(self.rng.normal(1.5, 0.6))
            clock_drift = float(self.rng.uniform(0.25, 0.45)) # 0.35 m/s stealth drift
            pseudorange_rms = float(self.rng.uniform(1.5, 2.8)) # Kept below 3m to stay under RAIM!
            doppler_pr_rate_diff = float(self.rng.uniform(0.4, 0.9))
            cycle_slip_ratio = float(self.rng.choice([0.0, 0.01], p=[0.85, 0.15]))
            agc_gain = float(self.rng.normal(38.2, 0.8))
            doa_az_var = float(self.rng.uniform(42.0, 68.0))
            ekf_innov = float(self.rng.uniform(5.5, 12.0)) # Slowly accumulates
            drift_cusum_increment = 0.85
            pdop = float(self.rng.uniform(1.4, 1.9))

        else:
            raise ValueError(f"Unknown attack type {attack_type}")

        # Update CUSUM and moving history
        if attack_type == SpoofingAttackType.AUTHENTIC:
            self.cusum_drift = max(0.0, self.cusum_drift * 0.8 - 0.2)
        else:
            self.cusum_drift += drift_cusum_increment

        self.cn0_history.append(cn0_mean)
        if len(self.cn0_history) > 10:
            self.cn0_history.pop(0)
        cn0_mov_var = float(np.var(self.cn0_history)) if len(self.cn0_history) >= 2 else cn0_var

        features_dict = {
            "cn0_mean_dbhz": round(cn0_mean, 2),
            "cn0_moving_variance": round(cn0_mov_var, 3),
            "sqm_ratio_metric": round(sqm_ratio, 3),
            "sqm_delta_asymmetry": round(sqm_delta, 3),
            "clock_bias_jump_m": round(clock_bias_jump, 2),
            "clock_drift_mps": round(clock_drift, 3),
            "pseudorange_residual_rms": round(pseudorange_rms, 2),
            "doppler_pseudorange_rate_diff": round(doppler_pr_rate_diff, 2),
            "carrier_phase_slip_ratio": round(cycle_slip_ratio, 3),
            "agc_gain_level_db": round(agc_gain, 1),
            "doa_azimuth_variance_deg": round(doa_az_var, 1),
            "ekf_innovation_mahalanobis": round(ekf_innov, 2),
            "cumulative_drift_cusum": round(self.cusum_drift, 2),
            "pdop_dilution": round(pdop, 2),
        }

        feature_vector = [features_dict[k] for k in self.FEATURE_KEYS]

        # Generate Correlator Taps
        taps_obj = self.generate_correlator_profile(
            attack_type=attack_type,
            spoofer_delay_chips=0.35 if is_spoofed else 0.0,
            spoofer_power_ratio=1.0 + (spoofer_power_advantage_db / 10.0),
        )

        # Generate Satellite Skyplot States
        sat_states: List[SatelliteState] = []
        for s in self.base_satellites:
            sat_is_spoofed = is_spoofed
            # Galileo OS-NMA simulation: Galileo signals have crypto authentication, legacy GPS does not
            if s["constellation"] == "Galileo":
                osnma_valid = not is_spoofed or attack_type == SpoofingAttackType.MEACONING
            else:
                osnma_valid = False # GPS L1 C/A has no OS-NMA

            sat_cn0 = s["cn0"] + (cn0_mean - 44.0) + float(self.rng.normal(0, 0.4))
            sat_res = float(self.rng.normal(0.0, pseudorange_rms * 0.7))

            sat_states.append(
                SatelliteState(
                    prn=s["prn"],
                    constellation=s["constellation"],
                    azimuth_deg=s["az"],
                    elevation_deg=s["el"],
                    cn0_dbhz=round(sat_cn0, 1),
                    pseudorange_m=round(20200000.0 + s["el"] * 1000.0 + sat_res, 1),
                    pseudorange_residual_m=round(sat_res, 2),
                    doppler_hz=round(-1200.0 + s["az"] * 4.5, 1),
                    osnma_authenticated=osnma_valid,
                    is_spoofed_satellite=sat_is_spoofed,
                )
            )

        return EpochTelemetry(
            epoch=epoch,
            timestamp_sec=float(epoch * 1.0),
            attack_type=attack_type,
            features_14d=features_dict,
            feature_vector=feature_vector,
            correlator_taps=taps_obj,
            satellites=sat_states,
            reported_lat=round(reported_lat, 7),
            reported_lon=round(reported_lon, 7),
            reported_alt=round(reported_alt, 2),
            true_lat=round(true_lat, 7),
            true_lon=round(true_lon, 7),
            true_alt=round(true_alt, 2),
            clock_bias_m=round(clock_bias_jump, 2),
            reported_speed_mps=12.5 if attack_type != SpoofingAttackType.SIMPLISTIC_NON_SYNC else 48.0,
            ground_truth_speed_mps=12.5,
        )
