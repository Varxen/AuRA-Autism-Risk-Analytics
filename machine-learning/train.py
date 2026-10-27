"""Train Stage 3.1 baselines on a stratified holdout from RAW DATA."""

from __future__ import annotations

from datetime import UTC, datetime
import json
from pathlib import Path
from time import perf_counter

from joblib import dump
from config import (
    CLASS_LABELS,
    LOW_MAX_SCORE,
    MODERATE_MAX_SCORE,
    RANDOM_STATE,
    SOURCE_DATASETS,
    TRAIN_SIZE,
    TEST_SIZE,
    VALIDATION_SIZE,
)
from data_splits import split_dataset
from evaluate import evaluate_predictions, print_metrics
from models import build_models
from prepare_dataset import load_dataset
from report_visuals import print_comparison_table, save_validation_dashboard

ROOT = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT / "artifacts"
REPORTS_DIR = ROOT / "reports"


def train_baselines() -> dict[str, object]:
    dataset = load_dataset()
    split = split_dataset(dataset.features, dataset.target)

    models = build_models()
    evaluations: dict[str, object] = {}
    chart_metrics: dict[str, dict[str, object]] = {}
    total_models = len(models)
    for index, (name, model) in enumerate(models.items(), start=1):
        print(f"\nTraining model {index}/{total_models}: {name.replace('_', ' ').title()} ({len(split.target_train)} rows)")
        started = perf_counter()
        if name == "xgboost":
            model.fit(
                split.features_train,
                split.target_train,
                eval_set=[(split.features_validation, split.target_validation)],
                verbose=50,
            )
        else:
            model.fit(split.features_train, split.target_train)
        print(f"Training time: {perf_counter() - started:.2f} seconds")
        validation_prediction = model.predict(split.features_validation)
        validation_metrics = evaluate_predictions(split.target_validation, validation_prediction)
        evaluations[name] = {"validation": validation_metrics}
        chart_metrics[name] = validation_metrics
        print_metrics(f"Validation results: {name.replace('_', ' ').title()}", validation_metrics)

    print_comparison_table("Stage 3.1 validation comparison", chart_metrics)

    report: dict[str, object] = {
        "stage": "3.1 multi-model classification baseline",
        "created_at": datetime.now(UTC).isoformat(),
        "source_workbooks": [path.name for path, _ in SOURCE_DATASETS],
        "source_sheets": {path.name: list(sheets) for path, sheets in SOURCE_DATASETS},
        "training_rows": dataset.rows_used,
        "excluded_without_consent": dataset.rows_excluded_without_consent,
        "train_rows": int(len(split.target_train)),
        "validation_rows": int(len(split.target_validation)),
        "test_rows": int(len(split.target_test)),
        "feature_order": [f"Q{number}" for number in range(1, 14)],
        "class_order": list(CLASS_LABELS),
        "class_counts": dataset.label_counts,
        "class_encoding": {label: index for index, label in enumerate(CLASS_LABELS)},
        "target_source": "Ground Truth Labels; category worksheets checked where present",
        "target_cutoffs": {
            "Low": f"0-{LOW_MAX_SCORE}",
            "Moderate": f"{LOW_MAX_SCORE + 1}-{MODERATE_MAX_SCORE}",
            "High": f"{MODERATE_MAX_SCORE + 1}-26",
        },
        "random_state": RANDOM_STATE,
        "split_ratio": {
            "train": TRAIN_SIZE,
            "validation": VALIDATION_SIZE,
            "test": TEST_SIZE,
        },
        "test_set_status": "Reserved for final evaluation in Stage 3.2; not used to compare or tune Stage 3.1 models.",
        "models": evaluations,
        "limitation": (
            "The workbook labels are derived from the same 13 scores used as features. "
            "These metrics describe reproduction of preliminary score cutoffs, not "
            "independent clinical or ASD-risk prediction."
        ),
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    for name, model in models.items():
        dump(model, ARTIFACTS_DIR / f"{name}.joblib")
    report_path = REPORTS_DIR / "stage_3_1_baseline.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    chart_path = save_validation_dashboard(chart_metrics, REPORTS_DIR / "stage_3_1_validation_dashboard.png")
    print(f"Trained {len(models)} models on {dataset.rows_used} consented records.")
    print(f"Aggregate evaluation report: {report_path}")
    if chart_path:
        print(f"Validation charts: {chart_path}")
    print("Target labels are provisional score-derived categories, not clinical outcomes.")
    return report


if __name__ == "__main__":
    train_baselines()
