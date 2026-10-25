"""Create one reproducible, stratified train/validation/test split."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.model_selection import train_test_split

from config import RANDOM_STATE, TEST_SIZE, TRAIN_SIZE, VALIDATION_SIZE


@dataclass(frozen=True, slots=True)
class DatasetSplit:
    features_train: np.ndarray
    features_validation: np.ndarray
    features_test: np.ndarray
    target_train: np.ndarray
    target_validation: np.ndarray
    target_test: np.ndarray


def split_dataset(features: np.ndarray, target: np.ndarray) -> DatasetSplit:
    features_train, features_remaining, target_train, target_remaining = train_test_split(
        features,
        target,
        train_size=TRAIN_SIZE,
        random_state=RANDOM_STATE,
        stratify=target,
    )
    test_share_of_remaining = TEST_SIZE / (VALIDATION_SIZE + TEST_SIZE)
    features_validation, features_test, target_validation, target_test = train_test_split(
        features_remaining,
        target_remaining,
        test_size=test_share_of_remaining,
        random_state=RANDOM_STATE,
        stratify=target_remaining,
    )
    return DatasetSplit(
        features_train=features_train,
        features_validation=features_validation,
        features_test=features_test,
        target_train=target_train,
        target_validation=target_validation,
        target_test=target_test,
    )
