"""Encode the questionnaire's structured answers as one ordered 13-value vector."""

from __future__ import annotations

from collections.abc import Iterable
from numbers import Integral

QUESTION_COUNT = 13

_QUESTION_SCORES = tuple(
    {"always": 0, "sometimes": 1, "never": 2}
    if question_number <= 9
    else {"no": 0, "sometimes": 1, "yes": 2}
    for question_number in range(1, QUESTION_COUNT + 1)
)


def validate_feature_values(values: Iterable[int]) -> tuple[int, ...]:
    """Validate an existing ordered score vector from an approved data source."""
    vector = tuple(values)
    if len(vector) != QUESTION_COUNT:
        raise ValueError("Feature vector must contain exactly 13 values.")
    if any(
        isinstance(value, bool) or not isinstance(value, Integral) or value not in (0, 1, 2)
        for value in vector
    ):
        raise ValueError("Feature values must be integers from 0 to 2.")
    return tuple(int(value) for value in vector)


def score_answer(question_number: int, selected_option_id: str) -> int:
    """Return one approved ordinal value for a canonical option ID."""
    if isinstance(question_number, bool) or not isinstance(question_number, int):
        raise ValueError("Question number must be an integer from 1 to 13.")
    if not 1 <= question_number <= QUESTION_COUNT:
        raise ValueError("Question number must be from 1 to 13.")
    if not isinstance(selected_option_id, str):
        raise ValueError("Selected option must be a canonical answer ID.")

    option_id = selected_option_id.strip().casefold()
    score = _QUESTION_SCORES[question_number - 1].get(option_id)
    if score is None:
        raise ValueError(f"Option is not valid for question {question_number}.")
    return score


def encode_feature_vector(answers: Iterable[tuple[int, str]]) -> tuple[int, ...]:
    """Return scores in Q1–Q13 order; reject missing, duplicate or invalid answers.

    The input contains only accepted structured answers. Follow-up text and its
    interpretation are deliberately not used as features in this baseline.
    """
    values: dict[int, int] = {}
    for question_number, selected_option_id in answers:
        score = score_answer(question_number, selected_option_id)
        if question_number in values:
            raise ValueError(f"Duplicate answer for question {question_number}.")
        values[question_number] = score

    missing = [number for number in range(1, QUESTION_COUNT + 1) if number not in values]
    if missing:
        missing_list = ", ".join(f"Q{number}" for number in missing)
        raise ValueError(f"Cannot encode an incomplete questionnaire; missing {missing_list}.")

    return validate_feature_values(values[number] for number in range(1, QUESTION_COUNT + 1))
