"""
AEGIS-GIS 5-Layer Defense & ML Engine
Implements Section 6 & Table 2 of the KJSCE Research Paper.
"""

from .physical_crypto_layers import (
    SQMDetector,
    MultiAntennaDoADetector,
    GalileoOSNMAVerifier,
    LayerDetectionResult,
)
from .kalman_raim_fusion import (
    RAIMIntegrityMonitor,
    INSGNSSExtendedKalmanFilter,
    RAIMResult,
    EKFStateOutput,
)
from .ml_classifier import (
    AEGISMultiClassSpoofingClassifier,
    CLASS_NAMES,
    FEATURE_NAMES,
    generate_texbat_benchmark_dataset,
)
from .layered_pipeline import (
    LayeredDefenseCoordinator,
    LayeredEpochRecord,
)

__all__ = [
    "SQMDetector",
    "MultiAntennaDoADetector",
    "GalileoOSNMAVerifier",
    "LayerDetectionResult",
    "RAIMIntegrityMonitor",
    "INSGNSSExtendedKalmanFilter",
    "RAIMResult",
    "EKFStateOutput",
    "AEGISMultiClassSpoofingClassifier",
    "CLASS_NAMES",
    "FEATURE_NAMES",
    "generate_texbat_benchmark_dataset",
    "LayeredDefenseCoordinator",
    "LayeredEpochRecord",
]
