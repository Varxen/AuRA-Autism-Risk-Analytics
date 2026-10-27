"""Evaluate equal-weight soft voting on validation and held-out test data."""

from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from collections.abc import Mapping
from typing import Protocol

import numpy as np
from joblib import load

from config import (
    CLASS_LABELS,
    RANDOM_STATE,
    SOURCE_DATASETS,
    TEST_SIZE,
    TRAIN_SIZE,
    VALIDATION_SIZE,
)
ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
REPORTS_DIR = ROOT / "reports"
MODEL_NAMES = ("logistic_regression", "random_forest", "xgboost")


class ProbabilisticClassifier(Protocol):
    classes_: np.ndarray

    def predict_proba(self, features: np.ndarray) -> np.ndarray: ...


def average_class_probabilities(
    models: Mapping[str, ProbabilisticClassifier],
    features: np.ndarray,
) -> np.ndarray:
    """Average probabilities in the fixed Low/Moderate/High class order."""
    if not models:
        raise ValueError("Soft voting needs at least one trained model.")

    expected_classes = tuple(range(len(CLASS_LABELS)))
    model_probabilities = []
    for name, model in models.items():
        model_classes = tuple(int(value) for value in model.classes_)
        if len(model_classes) != len(expected_classes) or set(model_classes) != set(expected_classes):
            raise ValueError(f"{name} does not contain the expected Low/Moderate/High classes.")
        raw = np.asarray(model.predict_proba(features), dtype=np.float64)
        if raw.shape != (len(features), len(expected_classes)):
            raise ValueError(f"{name} returned probabilities with an unexpected shape.")
        reordered = raw[:, [model_classes.index(class_index) for class_index in expected_classes]]
        if not np.isfinite(reordered).all() or (reordered < 0).any() or (reordered > 1).any():
            raise ValueError(f"{name} returned invalid class probabilities.")
        if not np.allclose(reordered.sum(axis=1), 1.0, atol=1e-5):
            raise ValueError(f"{name} class probabilities do not sum to 1.")
        model_probabilities.append(reordered)

    return np.mean(np.stack(model_probabilities, axis=0), axis=0)


def predict_categories(averaged_probabilities: np.ndarray) -> np.ndarray:
    """Choose the highest-average-probability score-derived category."""
    probabilities = np.asarray(averaged_probabilities, dtype=np.float64)
    if probabilities.ndim != 2 or probabilities.shape[1] != len(CLASS_LABELS):
        raise ValueError("Expected one probability column for Low, Moderate, and High.")
    if not np.isfinite(probabilities).all():
        raise ValueError("Class probabilities must be finite numbers.")
    return probabilities.argmax(axis=1)


def run_stage_3_2() -> dict[str, object]:
    """Load the Stage 3.1 models and evaluate their unweighted probability mean."""
    from data_splits import split_dataset
    from evaluate import evaluate_predictions, print_metrics
    from prepare_dataset import load_dataset
    from report_visuals import print_comparison_table, save_ensemble_dashboard

    dataset = load_dataset()
    split = split_dataset(dataset.features, dataset.target)
    models = {}
    for name in MODEL_NAMES:
        model_path = ARTIFACTS_DIR / f"{name}.joblib"
        if not model_path.is_file():
            raise FileNotFoundError(f"Missing Stage 3.1 model: {model_path}. Run train.py first.")
        models[name] = load(model_path)

    validation_probabilities = average_class_probabilities(models, split.features_validation)
    validation_prediction = predict_categories(validation_probabilities)
    validation_metrics = evaluate_predictions(split.target_validation, validation_prediction)

    # Test data is used once for final reporting; do not tune model choices from this result.
    test_probabilities = average_class_probabilities(models, split.features_test)
    test_prediction = predict_categories(test_probabilities)
    test_metrics = evaluate_predictions(split.target_test, test_prediction)

    print("Stage 3.2: equal-weight soft voting")
    print(f"Models: {', '.join(MODEL_NAMES)}")
    print(f"Method: arithmetic mean of class probabilities; class order = {', '.join(CLASS_LABELS)}")
    print_metrics("Ensemble validation results", validation_metrics)
    print_metrics("Final held-out test results", test_metrics)
    print_comparison_table(
        "Stage 3.2 validation and held-out test comparison",
        {"validation": validation_metrics, "held_out_test": test_metrics},
    )

    report: dict[str, object] = {
        "stage": "3.2 equal-weight soft voting",
        "created_at": datetime.now(UTC).isoformat(),
        "source_workbooks": [path.name for path, _ in SOURCE_DATASETS],
        "source_sheets": {path.name: list(sheets) for path, sheets in SOURCE_DATASETS},
        "records_used": dataset.rows_used,
        "split": {
            "train_rows": int(len(split.target_train)),
            "validation_rows": int(len(split.target_validation)),
            "test_rows": int(len(split.target_test)),
            "random_state": RANDOM_STATE,
            "ratios": {
                "train": TRAIN_SIZE,
                "validation": VALIDATION_SIZE,
                "test": TEST_SIZE,
            },
        },
        "models": list(MODEL_NAMES),
        "voting": "unweighted arithmetic mean of predict_proba outputs",
        "class_order": list(CLASS_LABELS),
        "validation": validation_metrics,
        "test": test_metrics,
        "interpretation": (
            "Probabilities describe model support for provisional score-derived categories, "
            "not the probability that a child has ASD. Categories are calculated from the "
            "same 13 feature scores, so this evaluates reproduction of preliminary cutoffs, "
            "not independent clinical prediction."
        ),
        "test_usage": "Final ensemble evaluation only; do not use these results for model tuning.",
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = REPORTS_DIR / "stage_3_2_soft_voting.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    chart_path = save_ensemble_dashboard(
        validation_metrics,
        test_metrics,
        REPORTS_DIR / "stage_3_2_soft_voting_dashboard.png",
    )
    print(f"Aggregate report: {report_path}")
    if chart_path:
        print(f"Evaluation dashboard: {chart_path[0]}")
        print(f"Held-out test confusion matrix: {chart_path[1]}")
    print("Categories and class probabilities are score-derived, not ASD risk estimates.")
    return report


if __name__ == "__main__":
    run_stage_3_2()
