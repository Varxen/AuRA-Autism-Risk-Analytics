"""Summarize held-out classification performance without saving row predictions."""

from __future__ import annotations

from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from config import CLASS_LABELS


def evaluate_predictions(actual, predicted) -> dict[str, object]:
    labels = list(range(len(CLASS_LABELS)))
    return {
        "accuracy": float(accuracy_score(actual, predicted)),
        "per_class": classification_report(
            actual,
            predicted,
            labels=labels,
            target_names=list(CLASS_LABELS),
            output_dict=True,
            zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(actual, predicted, labels=labels).tolist(),
        "class_order": list(CLASS_LABELS),
    }


def print_metrics(title: str, metrics: dict[str, object]) -> None:
    per_class = metrics["per_class"]
    matrix = metrics["confusion_matrix"]
    print(f"\n{title}", flush=True)
    print(f"Accuracy: {metrics['accuracy']:.2%}", flush=True)
    print(f"Macro F1: {per_class['macro avg']['f1-score']:.4f}", flush=True)
    print("Confusion matrix (rows = actual, columns = predicted):", flush=True)
    print("             " + " ".join(f"{label:>10}" for label in CLASS_LABELS), flush=True)
    for label, values in zip(CLASS_LABELS, matrix):
        print(f"{label:>12} " + " ".join(f"{value:>10}" for value in values), flush=True)
    print("Per-class precision / recall / F1 / support:", flush=True)
    for label in CLASS_LABELS:
        result = per_class[label]
        print(
            f"  {label:<9} {result['precision']:.3f} / {result['recall']:.3f} / "
            f"{result['f1-score']:.3f} / {int(result['support'])}",
            flush=True,
        )
