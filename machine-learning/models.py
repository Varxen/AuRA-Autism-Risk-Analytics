"""Create the three baseline multi-class models with a shared class order."""

from __future__ import annotations

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from config import RANDOM_STATE


def build_models() -> dict[str, object]:
    try:
        from xgboost import XGBClassifier
    except ImportError as error:
        raise RuntimeError(
            "XGBoost is required for Stage 3.1. Install machine-learning/requirements.txt."
        ) from error

    return {
        "logistic_regression": LogisticRegression(
            max_iter=3000,
            random_state=RANDOM_STATE,
            verbose=1,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=300,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbose=1,
        ),
        "xgboost": XGBClassifier(
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss",
            n_estimators=300,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=RANDOM_STATE,
            n_jobs=1,
        ),
    }
