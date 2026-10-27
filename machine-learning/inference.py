"""Load saved Stage 3.1 artifacts and predict with Stage 3.2 soft voting."""

from __future__ import annotations

from functools import lru_cache
from hashlib import sha256
from pathlib import Path
from typing import TypedDict

import numpy as np
from joblib import load

from config import CLASS_LABELS
from feature_encoding import validate_feature_values
from soft_voting import MODEL_NAMES, average_class_probabilities, predict_categories

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_VERSION_PREFIX = "stage-3.2-soft-voting-v1"


class Prediction(TypedDict):
    category: str
    model_version: str
    probabilities: dict[str, float]
    support_changes: list[dict[str, int | float]]


class ModelInferenceError(RuntimeError):
    """Saved classifier artifacts are missing, unreadable, or incompatible."""


@lru_cache(maxsize=1)
def _load_models() -> tuple[dict, str]:
    models = {}
    version_hash = sha256()
    try:
        for name in MODEL_NAMES:
            path = ARTIFACTS_DIR / f"{name}.joblib"
            if not path.is_file():
                raise ModelInferenceError(f"Missing trained model artifact: {path.name}")
            version_hash.update(name.encode("utf-8"))
            with path.open("rb") as artifact:
                for chunk in iter(lambda: artifact.read(1024 * 1024), b""):
                    version_hash.update(chunk)
            models[name] = load(path)
    except ModelInferenceError:
        raise
    except Exception as error:
        raise ModelInferenceError("A trained model artifact could not be loaded.") from error
    return models, f"{MODEL_VERSION_PREFIX}+{version_hash.hexdigest()[:12]}"


def predict_with_soft_voting(values: list[int] | tuple[int, ...]) -> Prediction:
    """Return category and model support for an accepted 13-value answer vector."""
    vector = validate_feature_values(values)
    features = np.asarray([vector], dtype=np.float32)
    try:
        models, model_version = _load_models()
        probabilities = average_class_probabilities(models, features)[0]
        predicted_index = int(predict_categories(probabilities.reshape(1, -1))[0])
        reference_features = np.repeat(features, len(vector), axis=0)
        for feature_index in range(len(vector)):
            reference_features[feature_index, feature_index] = 1
        reference_probabilities = average_class_probabilities(models, reference_features)
    except ModelInferenceError:
        raise
    except Exception as error:
        raise ModelInferenceError("The saved models could not classify this assessment.") from error

    return {
        "category": CLASS_LABELS[predicted_index],
        "model_version": model_version,
        "probabilities": {
            label: float(probabilities[index])
            for index, label in enumerate(CLASS_LABELS)
        },
        "support_changes": [
            {
                "feature_index": feature_index,
                "support_change": float(
                    probabilities[predicted_index]
                    - reference_probabilities[feature_index, predicted_index]
                ),
            }
            for feature_index in range(len(vector))
        ],
    }
