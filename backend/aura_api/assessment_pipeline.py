"""Bridge the API to the shared research pipeline in the repository workspace."""

from pathlib import Path
import sys

_PIPELINE_DIR = Path(__file__).resolve().parents[2] / "machine-learning"
if str(_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(_PIPELINE_DIR))

from feature_encoding import (  # noqa: E402
    encode_feature_vector,
    score_answer,
    validate_feature_values,
)
from inference import ModelInferenceError, predict_with_soft_voting  # noqa: E402

__all__ = [
    "encode_feature_vector",
    "score_answer",
    "validate_feature_values",
    "ModelInferenceError",
    "predict_with_soft_voting",
]
