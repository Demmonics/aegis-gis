"""
AEGIS-GIS: Layer 4 — Tightly-Coupled INS/GNSS Extended Kalman Filter & RAIM Fusion
Implements Sections 6.4 & 6.6 of the KJSCE Research Paper:
- Receiver Autonomous Integrity Monitoring (RAIM Chi-Square Residual Check)
- 8-State Tightly-Coupled INS/GNSS Extended Kalman Filter (EKF)
- Innovation Mahalanobis Gate & Autonomous Spoofed Measurement Rejection
- True Trajectory Recovery via Strapdown Inertial Dead-Reckoning (Cyan Path)
"""

import math
from typing import Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field
import numpy as np

WGS84_A = 6378137.0
DEG_TO_RAD = math.pi / 180.0
RAD_TO_DEG = 180.0 / math.pi


class RAIMResult(BaseModel):
    sse: float
    degrees_of_freedom: int
    chi2_threshold: float
    test_statistic: float
    alarm_triggered: bool
    explanation: str


class EKFStateOutput(BaseModel):
    epoch: int
    mode: str # "AUTHENTIC_GNSS_LOCKED" or "MITIGATION_INS_COASTING"
    raw_gnss_lat: float
    raw_gnss_lon: float
    raw_gnss_alt: float
    reconstructed_lat: float
    reconstructed_lon: float
    reconstructed_alt: float
    velocity_ned_mps: Tuple[float, float, float]
    clock_bias_m: float
    clock_drift_mps: float
    innovation_mahalanobis: float
    position_uncertainty_m: float
    accumulated_ins_drift_m: float
    spoofing_rejected: bool


class RAIMIntegrityMonitor:
    """
    Section 6.4: Receiver Autonomous Integrity Monitoring (RAIM)
    Tests pseudorange residual Sum of Squared Errors (SSE) against chi-square threshold.
    """

    # Chi-square critical values for alpha = 0.001 (99.9% confidence)
    CHI2_TABLE_999 = {
        1: 10.83, 2: 13.82, 3: 16.27, 4: 18.47, 5: 20.52,
        6: 22.46, 7: 24.32, 8: 26.12, 9: 27.88, 10: 29.59
    }

    def evaluate(self, satellite_count: int, pseudorange_residual_rms: float) -> RAIMResult:
        dof = max(1, satellite_count - 4)
        threshold = self.CHI2_TABLE_999.get(dof, 20.0 + dof * 2.0)

        # Approximate SSE = N * (RMS / sigma_pr)^2 with sigma_pr = 1.5m
        sigma_pr = 1.5
        normalized_rms = pseudorange_residual_rms / sigma_pr
        sse = float(satellite_count * (normalized_rms ** 2))

        triggered = (sse > threshold)

        explanation = (
            f"RAIM Chi-Square Alarm Triggered: SSE={sse:.2f} > threshold={threshold:.2f} (dof={dof}). "
            f"Pseudorange residuals violate multi-constellation geometric consistency!" if triggered
            else f"RAIM Consistent: SSE={sse:.2f} <= threshold={threshold:.2f} (dof={dof})."
        )

        return RAIMResult(
            sse=round(sse, 2),
            degrees_of_freedom=dof,
            chi2_threshold=round(threshold, 2),
            test_statistic=round(sse / threshold, 3),
            alarm_triggered=triggered,
            explanation=explanation
        )


class INSGNSSExtendedKalmanFilter:
    """
    Tightly-Coupled INS/GNSS Extended Kalman Filter (EKF) with Autonomous Spoofing Rejection.
    Maintains 8 states:
      x = [lat (rad), lon (rad), alt (m), v_N (m/s), v_E (m/s), v_D (m/s), b_clk (m), d_b_clk (m/s)]^T
    """

    def __init__(
        self,
        initial_lat: float,
        initial_lon: float,
        initial_alt: float = 10.0,
        initial_v_n: float = 0.0,
        initial_v_e: float = 0.0,
        initial_v_d: float = 0.0,
        accel_noise_std: float = 0.08, # m/s^2 MEMS accelerometer noise
        gnss_pos_noise_std: float = 1.5, # meters GNSS nominal noise
        innovation_gate_threshold: float = 9.21 # Chi2(2 DOF) at 99%
    ):
        self.state = np.array([
            initial_lat * DEG_TO_RAD,
            initial_lon * DEG_TO_RAD,
            initial_alt,
            initial_v_n,
            initial_v_e,
            initial_v_d,
            0.0, # b_clk
            0.0  # d_b_clk
        ], dtype=np.float64)

        # State Covariance P (8x8)
        self.P = np.diag([
            (2.0 / WGS84_A)**2, # lat
            (2.0 / WGS84_A)**2, # lon
            4.0,                # alt
            0.25, 0.25, 0.25,   # velocities
            25.0, 1.0           # clock states
        ])

        self.accel_noise_std = accel_noise_std
        self.gnss_pos_noise_std = gnss_pos_noise_std
        self.innovation_gate = innovation_gate_threshold

        self.consecutive_rejections = 0
        self.accumulated_drift_m = 0.0
        self.step_count = 0

    def predict(self, dt: float, accel_imu_mps2: Tuple[float, float, float] = (0.0, 0.0, 0.0)):
        """
        Strapdown IMU Mechanization prediction step.
        """
        lat = self.state[0]
        lon = self.state[1]
        alt = self.state[2]
        vn = self.state[3]
        ve = self.state[4]
        vd = self.state[5]
        b_clk = self.state[6]
        d_b_clk = self.state[7]

        # Meridian and Prime Vertical Radii of Curvature
        r_m = WGS84_A * (1.0 - 0.00669438) / ((1.0 - 0.00669438 * math.sin(lat)**2)**1.5)
        r_n = WGS84_A / math.sqrt(1.0 - 0.00669438 * math.sin(lat)**2)

        # State transition
        new_lat = lat + (vn / (r_m + alt)) * dt
        new_lon = lon + (ve / ((r_n + alt) * math.cos(lat))) * dt
        new_alt = alt - vd * dt

        new_vn = vn + accel_imu_mps2[0] * dt
        new_ve = ve + accel_imu_mps2[1] * dt
        new_vd = vd + accel_imu_mps2[2] * dt

        new_b_clk = b_clk + d_b_clk * dt
        new_d_b_clk = d_b_clk

        # State transition matrix F (8x8)
        F = np.eye(8, dtype=np.float64)
        F[0, 3] = dt / (r_m + alt)
        F[1, 4] = dt / ((r_n + alt) * math.cos(lat))
        F[2, 5] = -dt
        F[6, 7] = dt

        self.state = np.array([
            new_lat, new_lon, new_alt,
            new_vn, new_ve, new_vd,
            new_b_clk, new_d_b_clk
        ], dtype=np.float64)

        # Process noise covariance Q (8x8)
        q_pos = (0.5 * self.accel_noise_std * dt**2)
        q_vel = self.accel_noise_std * dt

        q_diag = np.array([
            (q_pos / WGS84_A)**2,
            (q_pos / WGS84_A)**2,
            q_pos**2,
            q_vel**2,
            q_vel**2,
            q_vel**2,
            (0.1 * dt)**2,
            (0.01 * dt)**2
        ])
        Q = np.diag(q_diag)
        self.P = F @ self.P @ F.T + Q

    def update_gnss(
        self,
        epoch: int,
        gnss_lat_deg: float,
        gnss_lon_deg: float,
        gnss_alt_m: float,
        force_reject: bool = False
    ) -> EKFStateOutput:
        """
        EKF Measurement update with Innovation Gate & Spoofing Rejection.
        """
        lat_pred = self.state[0]
        lon_pred = self.state[1]
        alt_pred = self.state[2]

        z_meas = np.array([
            gnss_lat_deg * DEG_TO_RAD,
            gnss_lon_deg * DEG_TO_RAD,
            gnss_alt_m
        ], dtype=np.float64)

        # Measurement model H (3x8)
        H = np.zeros((3, 8), dtype=np.float64)
        H[0, 0] = 1.0 # lat
        H[1, 1] = 1.0 # lon
        H[2, 2] = 1.0 # alt

        # Measurement covariance R (3x3)
        R = np.diag([
            (self.gnss_pos_noise_std / WGS84_A)**2,
            (self.gnss_pos_noise_std / (WGS84_A * math.cos(lat_pred)))**2,
            (self.gnss_pos_noise_std * 1.5)**2
        ])

        # Innovation: y = z - H*x
        y_innov = z_meas - np.array([lat_pred, lon_pred, alt_pred])

        # Innovation covariance: S = H * P * H^T + R
        S = H @ self.P @ H.T + R
        try:
            S_inv = np.linalg.inv(S)
        except Exception:
            S_inv = np.linalg.pinv(S)

        if self.step_count == 0 and epoch == 0 and not force_reject:
            # Anchor initial state
            self.state[0] = gnss_lat_deg * DEG_TO_RAD
            self.state[1] = gnss_lon_deg * DEG_TO_RAD
            self.state[2] = gnss_alt_m
            gamma = 0.0
            is_spoofed = False
        else:
            gamma = float(y_innov.T @ S_inv @ y_innov)
            # Gating condition: Mahalanobis distance > threshold or external ML alert
            is_spoofed = (gamma > self.innovation_gate or force_reject)

        self.step_count += 1

        if is_spoofed:
            # MITIGATION MODE: Reject corrupted GNSS measurement!
            self.consecutive_rejections += 1
            # Realistic MEMS bias drift: ~0.05 m/s^2 * t^2
            self.accumulated_drift_m = 0.5 * 0.05 * (self.consecutive_rejections ** 1.8)

            mode_str = "MITIGATION_INS_COASTING"
            # Do NOT update state with corrupted GNSS; coast on IMU prediction
        else:
            # AUTHENTIC UPDATE MODE
            self.consecutive_rejections = 0
            self.accumulated_drift_m = 0.0
            mode_str = "AUTHENTIC_GNSS_LOCKED"

            if not (self.step_count == 1 and epoch == 0):
                K = self.P @ H.T @ S_inv
                self.state += K @ y_innov
                self.P = (np.eye(8) - K @ H) @ self.P

        rec_lat_deg = float(self.state[0] * RAD_TO_DEG)
        rec_lon_deg = float(self.state[1] * RAD_TO_DEG)
        rec_alt_m = float(self.state[2])

        pos_uncert_m = float(math.sqrt(self.P[0, 0] * WGS84_A**2 + self.P[1, 1] * WGS84_A**2))

        return EKFStateOutput(
            epoch=epoch,
            mode=mode_str,
            raw_gnss_lat=round(gnss_lat_deg, 7),
            raw_gnss_lon=round(gnss_lon_deg, 7),
            raw_gnss_alt=round(gnss_alt_m, 2),
            reconstructed_lat=round(rec_lat_deg, 7),
            reconstructed_lon=round(rec_lon_deg, 7),
            reconstructed_alt=round(rec_alt_m, 2),
            velocity_ned_mps=(
                round(float(self.state[3]), 2),
                round(float(self.state[4]), 2),
                round(float(self.state[5]), 2)
            ),
            clock_bias_m=round(float(self.state[6]), 2),
            clock_drift_mps=round(float(self.state[7]), 3),
            innovation_mahalanobis=round(gamma, 2),
            position_uncertainty_m=round(pos_uncert_m, 2),
            accumulated_ins_drift_m=round(self.accumulated_drift_m, 2),
            spoofing_rejected=is_spoofed
        )
