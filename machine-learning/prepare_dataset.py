"""Load consented score-category records from the configured workbooks."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from openpyxl import load_workbook

from config import CLASS_LABELS, CLASS_TO_INDEX, SOURCE_DATASETS, score_category
from feature_encoding import validate_feature_values


@dataclass(frozen=True, slots=True)
class PreparedDataset:
    features: np.ndarray
    target: np.ndarray
    rows_used: int
    rows_excluded_without_consent: int
    label_counts: dict[str, int]


def _column_index(headers: tuple[object, ...], label: str, location: str) -> int:
    matches = [
        index for index, value in enumerate(headers)
        if isinstance(value, str) and value.strip().casefold() == label.casefold()
    ]
    if len(matches) != 1:
        raise ValueError(f"Expected one '{label}' column in {location}.")
    return matches[0]


def _feature_columns(
    main_headers: tuple[object, ...],
    sub_headers: tuple[object, ...],
    location: str,
) -> list[int]:
    columns: dict[int, int] = {}
    for index, header in enumerate(main_headers):
        if not isinstance(header, str):
            continue
        match = re.match(r"^Q(\d+)\.", header.strip(), flags=re.IGNORECASE)
        if match:
            question_number = int(match.group(1))
            score_indexes = [
                candidate
                for candidate in range(index, min(index + 3, len(sub_headers)))
                if isinstance(sub_headers[candidate], str)
                and sub_headers[candidate].strip().casefold() == "score"
            ]
            if len(score_indexes) == 1:
                if question_number in columns:
                    raise ValueError(f"Duplicate score column for Q{question_number} in {location}.")
                columns[question_number] = score_indexes[0]

    if set(columns) != set(range(1, 14)):
        raise ValueError(f"{location} must contain one score column for each question Q1–Q13.")
    return [columns[number] for number in range(1, 14)]


def load_dataset() -> PreparedDataset:
    respondent_codes: set[tuple[Path, str, str]] = set()
    features: list[tuple[int, ...]] = []
    targets: list[int] = []
    label_counts: Counter[str] = Counter()
    excluded_without_consent = 0

    for workbook_path, sheet_names in SOURCE_DATASETS:
        if not workbook_path.is_file():
            raise FileNotFoundError(f"Training workbook not found: {workbook_path}")

        workbook = load_workbook(workbook_path, read_only=True, data_only=True)
        try:
            missing_sheets = [name for name in sheet_names if name not in workbook.sheetnames]
            if missing_sheets:
                raise ValueError(
                    f"{workbook_path.name} is missing expected worksheet(s): {', '.join(missing_sheets)}."
                )

            for sheet_name in sheet_names:
                worksheet = workbook[sheet_name]
                location = f"{workbook_path.name} / {sheet_name}"
                rows = worksheet.iter_rows(values_only=True)
                main_headers = tuple(next(rows, ()))
                sub_headers = tuple(next(rows, ()))

                respondent_index = _column_index(main_headers, "Parent/Respondent Code", location)
                consent_index = _column_index(main_headers, "Data Privacy Consent Given", location)
                total_index = _column_index(main_headers, "TOTAL SCORE", location)
                label_index = _column_index(main_headers, "Ground Truth Labels", location)
                feature_columns = _feature_columns(main_headers, sub_headers, location)

                for row_number, row in enumerate(rows, start=3):
                    respondent_code = row[respondent_index] if respondent_index < len(row) else None
                    if respondent_code is None or not str(respondent_code).strip():
                        continue

                    consent = row[consent_index] if consent_index < len(row) else None
                    if not isinstance(consent, str) or consent.strip().casefold() != "yes":
                        excluded_without_consent += 1
                        continue

                    code = str(respondent_code).strip()
                    respondent_key = (workbook_path.resolve(), sheet_name, code)
                    if respondent_key in respondent_codes:
                        raise ValueError(f"Duplicate respondent code in {location}, row {row_number}.")
                    respondent_codes.add(respondent_key)

                    row_location = f"{location}, row {row_number}"
                    try:
                        vector = validate_feature_values(row[index] for index in feature_columns)
                    except (TypeError, ValueError) as error:
                        raise ValueError(f"Invalid Q1–Q13 score vector in {row_location}: {error}") from error

                    total = row[total_index] if total_index < len(row) else None
                    label = row[label_index] if label_index < len(row) else None
                    if isinstance(total, bool) or not isinstance(total, (int, float)) or int(total) != total:
                        raise ValueError(f"Missing or invalid total score in {row_location}.")
                    if sum(vector) != int(total):
                        raise ValueError(f"Q1–Q13 scores do not match TOTAL SCORE in {row_location}.")
                    if not isinstance(label, str) or label.strip() not in CLASS_TO_INDEX:
                        raise ValueError(f"Missing or invalid ground-truth category in {row_location}.")

                    normalized_label = label.strip()
                    if sheet_name in CLASS_TO_INDEX and normalized_label != sheet_name:
                        raise ValueError(
                            f"Ground-truth category does not match category worksheet in {row_location}."
                        )
                    if score_category(int(total)) != normalized_label:
                        raise ValueError(
                            f"Ground-truth category does not match the workbook's preliminary cutoffs in {row_location}."
                        )

                    features.append(vector)
                    targets.append(CLASS_TO_INDEX[normalized_label])
                    label_counts[normalized_label] += 1
        finally:
            workbook.close()

    if not features:
        raise ValueError("No consented, labeled rows are available for training.")

    return PreparedDataset(
        features=np.asarray(features, dtype=np.int8),
        target=np.asarray(targets, dtype=np.int64),
        rows_used=len(features),
        rows_excluded_without_consent=excluded_without_consent,
        label_counts={label: label_counts[label] for label in CLASS_LABELS},
    )
