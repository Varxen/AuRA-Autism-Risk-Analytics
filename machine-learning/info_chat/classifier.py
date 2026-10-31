"""Embed a chat message with the local encoder and classify its intent."""

from __future__ import annotations

from functools import lru_cache
from hashlib import sha256
import json
from pathlib import Path
from urllib.request import ProxyHandler, Request, build_opener

import numpy as np
from joblib import load

from .config import ARTIFACT_PATH, ENCODER_MODEL, OLLAMA_BASE_URL, OUT_OF_SCOPE


class IntentModelUnavailable(Exception):
    """The artifact or the local encoder could not be used."""


def embed(texts: list[str], base_url: str = OLLAMA_BASE_URL, timeout: float = 30) -> np.ndarray:
    """Return L2-normalised encoder vectors, one row per text."""
    request = Request(
        f"{base_url}/api/embed",
        data=json.dumps({"model": ENCODER_MODEL, "input": texts}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with build_opener(ProxyHandler({})).open(request, timeout=timeout) as response:
            vectors = json.loads(response.read())["embeddings"]
    except (OSError, ValueError, KeyError) as error:
        raise IntentModelUnavailable("The local encoder did not return embeddings.") from error
    matrix = np.asarray(vectors, dtype=np.float32)
    if matrix.ndim != 2 or matrix.shape[0] != len(texts):
        raise IntentModelUnavailable("The local encoder returned an unexpected shape.")
    return matrix / np.maximum(np.linalg.norm(matrix, axis=1, keepdims=True), 1e-12)


@lru_cache(maxsize=1)
def _artifact(path: Path = ARTIFACT_PATH) -> dict:
    try:
        return load(path)
    except OSError as error:
        raise IntentModelUnavailable("The info-chat intent artifact is missing.") from error


def model_version() -> str:
    return "info-chat-intent-v1+" + sha256(ARTIFACT_PATH.read_bytes()).hexdigest()[:12]


def classify(text: str, base_url: str = OLLAMA_BASE_URL, top_k: int = 3) -> dict:
    """Return the decision, best question, confidence and nearest questions."""
    artifact = _artifact()
    probabilities = artifact["classifier"].predict_proba(embed([text], base_url))[0]
    classes = list(artifact["classifier"].classes_)
    ranked = sorted(zip(classes, probabilities), key=lambda pair: pair[1], reverse=True)
    in_scope = [(label, float(score)) for label, score in ranked if label != OUT_OF_SCOPE]
    best_label, best_score = in_scope[0]
    top_label = ranked[0][0]
    if top_label == OUT_OF_SCOPE or best_score < artifact["suggest_threshold"]:
        decision = "fallback"
    elif best_score >= artifact["answer_threshold"]:
        decision = "answer"
    else:
        decision = "suggest"
    questions = artifact["questions"]
    return {
        "decision": decision,
        "question": questions[best_label] if decision == "answer" else None,
        "confidence": round(best_score, 4),
        "suggestions": [
            questions[label]
            for label, score in in_scope[:top_k]
            if score >= artifact["suggest_threshold"]
        ] if decision == "suggest" else [],
    }
