"""Render aggregate model metrics as shareable PNG charts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from config import CLASS_LABELS


def print_comparison_table(title: str, evaluations: dict[str, dict[str, Any]]) -> None:
    """Print a compact comparison of accuracy and macro precision/recall/F1."""
    print(f"\n{title}")
    print(f"{'Model':<24} {'Accuracy':>10} {'Macro P':>10} {'Macro R':>10} {'Macro F1':>10}")
    print("-" * 68)
    for name, metrics in evaluations.items():
        macro = metrics["per_class"]["macro avg"]
        print(
            f"{name.replace('_', ' ').title():<24} "
            f"{metrics['accuracy']:>9.2%} "
            f"{macro['precision']:>10.4f} {macro['recall']:>10.4f} "
            f"{macro['f1-score']:>10.4f}"
        )


def save_validation_dashboard(
    evaluations: dict[str, dict[str, Any]],
    output_path: Path,
) -> Path | None:
    """Save validation metric comparison and per-model confusion matrices."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("Charts skipped: install matplotlib from machine-learning/requirements.txt.")
        return None

    names = list(evaluations)
    labels = [name.replace("_", " ").title() for name in names]
    metric_names = ("accuracy", "precision", "recall", "f1-score")
    metric_labels = ("Accuracy", "Macro precision", "Macro recall", "Macro F1")
    values = [
        [
            evaluations[name]["accuracy"]
            if key == "accuracy"
            else evaluations[name]["per_class"]["macro avg"][key]
            for name in names
        ]
        for key in metric_names
    ]

    figure, axes = plt.subplots(1, len(names) + 1, figsize=(5.2 * (len(names) + 1), 5.2))
    metric_axis = axes[0]
    positions = np.arange(len(names))
    width = 0.19
    for index, (label, series) in enumerate(zip(metric_labels, values)):
        metric_axis.bar(positions + (index - 1.5) * width, series, width, label=label)
    metric_axis.set_title("Validation metrics")
    metric_axis.set_ylabel("Score")
    metric_axis.set_ylim(0, 1.14)
    metric_axis.set_xticks(positions, labels, rotation=18, ha="right")
    metric_axis.legend(fontsize=8, loc="lower left")
    metric_axis.grid(axis="y", alpha=0.2)

    for axis, name in zip(axes[1:], names):
        matrix = np.asarray(evaluations[name]["confusion_matrix"])
        image = axis.imshow(matrix, cmap="Blues")
        axis.set_title(f"{name.replace('_', ' ').title()}\nConfusion matrix")
        axis.set_xlabel("Predicted")
        axis.set_ylabel("Actual")
        axis.set_xticks(range(len(CLASS_LABELS)), CLASS_LABELS, rotation=25, ha="right")
        axis.set_yticks(range(len(CLASS_LABELS)), CLASS_LABELS)
        threshold = matrix.max() / 2 if matrix.size else 0
        for row in range(matrix.shape[0]):
            for column in range(matrix.shape[1]):
                axis.text(
                    column,
                    row,
                    str(matrix[row, column]),
                    ha="center",
                    va="center",
                    color="white" if matrix[row, column] > threshold else "black",
                )
        figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)

    figure.suptitle("Stage 3.1 — Validation summary", fontsize=15)
    figure.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output_path, dpi=160, bbox_inches="tight")
    plt.close(figure)
    return output_path


def save_ensemble_dashboard(
    validation: dict[str, Any],
    test: dict[str, Any],
    output_path: Path,
) -> tuple[Path, Path] | None:
    """Save ensemble validation/test metrics and confusion matrices."""
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np
    except ImportError:
        print("Charts skipped: install matplotlib from machine-learning/requirements.txt.")
        return None

    figure, axes = plt.subplots(1, 3, figsize=(15, 5.2))
    metrics = ("accuracy", "macro_f1")
    titles = ("Accuracy", "Macro F1")
    positions = np.arange(2)
    for index, (key, title) in enumerate(zip(metrics, titles)):
        values = [
            validation["accuracy"] if key == "accuracy" else validation["per_class"]["macro avg"]["f1-score"],
            test["accuracy"] if key == "accuracy" else test["per_class"]["macro avg"]["f1-score"],
        ]
        bars = axes[index].bar(("Validation", "Held-out test"), values, color=("#4f7cac", "#52a788"))
        axes[index].bar_label(bars, fmt="%.3f", padding=3)
        axes[index].set_title(title)
        axes[index].set_ylim(0, 1.12)
        axes[index].grid(axis="y", alpha=0.2)

    axis = axes[2]
    matrix = np.asarray(validation["confusion_matrix"])
    image = axis.imshow(matrix, cmap="Blues")
    axis.set_title("Validation confusion matrix")
    axis.set_xlabel("Predicted")
    axis.set_ylabel("Actual")
    axis.set_xticks(range(len(CLASS_LABELS)), CLASS_LABELS, rotation=25, ha="right")
    axis.set_yticks(range(len(CLASS_LABELS)), CLASS_LABELS)
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            axis.text(column, row, str(matrix[row, column]), ha="center", va="center")
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)

    figure.suptitle("Stage 3.2 — Equal-weight soft voting", fontsize=15)
    figure.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output_path, dpi=160, bbox_inches="tight")
    plt.close(figure)

    # Keep the final test confusion matrix distinct so it cannot be mistaken for validation.
    test_path = output_path.with_name(f"{output_path.stem}_held_out_test{output_path.suffix}")
    figure, axis = plt.subplots(figsize=(5.5, 5))
    matrix = np.asarray(test["confusion_matrix"])
    image = axis.imshow(matrix, cmap="Greens")
    axis.set_title("Stage 3.2 — Final held-out test confusion matrix")
    axis.set_xlabel("Predicted")
    axis.set_ylabel("Actual")
    axis.set_xticks(range(len(CLASS_LABELS)), CLASS_LABELS, rotation=25, ha="right")
    axis.set_yticks(range(len(CLASS_LABELS)), CLASS_LABELS)
    for row in range(matrix.shape[0]):
        for column in range(matrix.shape[1]):
            axis.text(column, row, str(matrix[row, column]), ha="center", va="center")
    figure.colorbar(image, ax=axis, fraction=0.046, pad=0.04)
    figure.tight_layout()
    figure.savefig(test_path, dpi=160, bbox_inches="tight")
    plt.close(figure)
    return output_path, test_path
