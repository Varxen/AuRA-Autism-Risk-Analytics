"""Fixed baseline settings for the provisional score-category experiment."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE_WORKBOOK = ROOT.parent / "documentation" / "AURA-DATASET.xlsx"
SOURCE_SHEET = "RAW DATA"

CLASS_LABELS = ("Low", "Moderate", "High")
CLASS_TO_INDEX = {label: index for index, label in enumerate(CLASS_LABELS)}

# Preliminary cutoffs from the workbook's Ground Truth Label Guide.
LOW_MAX_SCORE = 8
MODERATE_MAX_SCORE = 11

TRAIN_SIZE = 0.7
VALIDATION_SIZE = 0.15
TEST_SIZE = 0.15
RANDOM_STATE = 42


def score_category(total_score: int) -> str:
    if not 0 <= total_score <= 26:
        raise ValueError("Total score must be between 0 and 26.")
    if total_score <= LOW_MAX_SCORE:
        return "Low"
    if total_score <= MODERATE_MAX_SCORE:
        return "Moderate"
    return "High"
