"""Train the info-chat intent head on top of the local multilingual encoder.

Data sources, all human-reviewed:
  * intents.json         - the knowledge-base questions (English + Filipino), always train
  * data/collected_questions.csv - real questions: text,intent_id,source
        intent_id is a kb-NN id from intents.json, or `none` for out-of-scope
  * data/paraphrases.csv - text,intent_id,seed_text; used only when its seed is in train

Collected questions are split per intent into train/validation/test with a fixed seed,
so paraphrases never leak into held-out data.
"""

from __future__ import annotations

import csv
from hashlib import sha256
import json
import sys

from joblib import dump, load
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from info_chat.classifier import embed  # noqa: E402
from info_chat.config import (  # noqa: E402
    ARTIFACT_PATH,
    COLLECTED_PATH,
    DEFAULT_ANSWER_THRESHOLD,
    EMBED_CACHE_PATH,
    ENCODER_MODEL,
    INTENTS_PATH,
    OUT_OF_SCOPE,
    OUT_OF_SCOPE_SEED_PATH,
    PARAPHRASES_PATH,
    RANDOM_STATE,
    REPORT_PATH,
    SPLIT_FRACTIONS,
    SUGGEST_THRESHOLD,
    TARGET_ANSWER_PRECISION,
)


def read_rows(path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return [
            {key: (value or "").strip() for key, value in row.items()}
            for row in csv.DictReader(handle)
            if (row.get("text") or "").strip()
        ]


def split_collected(rows: list[dict]) -> dict[str, list[tuple[str, str]]]:
    rng = np.random.default_rng(RANDOM_STATE)
    by_intent: dict[str, list[str]] = {}
    for row in rows:
        by_intent.setdefault(row["intent_id"], []).append(row["text"])
    split = {"train": [], "val": [], "test": []}
    for intent, texts in sorted(by_intent.items()):
        texts = list(dict.fromkeys(texts))
        rng.shuffle(texts)
        n = len(texts)
        # Need at least 3 real questions to hold any out; fewer all go to train.
        n_val = n_test = max(1, round(n * SPLIT_FRACTIONS[1])) if n >= 3 else 0
        split["val"] += [(t, intent) for t in texts[:n_val]]
        split["test"] += [(t, intent) for t in texts[n_val:n_val + n_test]]
        split["train"] += [(t, intent) for t in texts[n_val + n_test:]]
    return split


def embeddings_for(texts: list[str]) -> np.ndarray:
    cache = load(EMBED_CACHE_PATH) if EMBED_CACHE_PATH.exists() else {}
    key = lambda text: sha256(f"{ENCODER_MODEL}\0{text}".encode()).hexdigest()  # noqa: E731
    missing = [text for text in dict.fromkeys(texts) if key(text) not in cache]
    for start in range(0, len(missing), 32):
        batch = missing[start:start + 32]
        for text, vector in zip(batch, embed(batch, timeout=120)):
            cache[key(text)] = vector
    if missing:
        dump(cache, EMBED_CACHE_PATH)
    return np.stack([cache[key(text)] for text in texts])


def main() -> None:
    intents = json.loads(INTENTS_PATH.read_text(encoding="utf-8"))
    questions = {item["id"]: item["questionEn"] for item in intents}

    seeds = [(item[key], item["id"]) for item in intents for key in ("questionEn", "questionTl")]
    seeds += [(text, item["id"]) for item in intents for text in item.get("examples", [])]
    if OUT_OF_SCOPE_SEED_PATH.exists():
        seeds += [(line.strip(), OUT_OF_SCOPE) for line in OUT_OF_SCOPE_SEED_PATH.read_text(encoding="utf-8").splitlines() if line.strip()]
    collected = read_rows(COLLECTED_PATH)
    unknown = {row["intent_id"] for row in collected} - set(questions) - {OUT_OF_SCOPE}
    if unknown:
        raise SystemExit(f"Unknown intent_id in collected_questions.csv: {sorted(unknown)}")
    split = split_collected(collected)
    train = seeds + split["train"]
    train_texts = {text for text, _ in train}
    train += [
        (row["text"], row["intent_id"])
        for row in read_rows(PARAPHRASES_PATH)
        if row.get("seed_text") in train_texts and row["intent_id"] in {*questions, OUT_OF_SCOPE}
    ]
    print(f"train={len(train)} val={len(split['val'])} test={len(split['test'])}")

    def matrix(pairs):
        return embeddings_for([text for text, _ in pairs]), np.array([label for _, label in pairs])

    x_train, y_train = matrix(train)
    x_val, y_val = matrix(split["val"]) if split["val"] else (None, None)
    x_test, y_test = matrix(split["test"]) if split["test"] else (None, None)

    best_c, best_acc = 1000.0, -1.0
    if x_val is not None:
        for c in (10.0, 100.0, 1000.0, 10000.0):
            candidate = LogisticRegression(C=c, max_iter=3000, random_state=RANDOM_STATE)
            candidate.fit(x_train, y_train)
            accuracy = accuracy_score(y_val, candidate.predict(x_val))
            if accuracy > best_acc:
                best_c, best_acc = c, accuracy
    classifier = LogisticRegression(C=best_c, max_iter=3000, random_state=RANDOM_STATE)
    classifier.fit(x_train, y_train)

    answer_threshold = DEFAULT_ANSWER_THRESHOLD
    if x_val is not None:
        probabilities = classifier.predict_proba(x_val)
        top = classifier.classes_[probabilities.argmax(axis=1)]
        confidence = probabilities.max(axis=1)
        for threshold in np.arange(0.3, 0.96, 0.05):
            accepted = (confidence >= threshold) & (top != OUT_OF_SCOPE)
            if accepted.sum() and (top[accepted] == y_val[accepted]).mean() >= TARGET_ANSWER_PRECISION:
                answer_threshold = round(float(threshold), 2)
                break

    report = {
        "encoder": ENCODER_MODEL,
        "classes": len(classifier.classes_),
        "train_rows": len(train),
        "validation_rows": len(split["val"]),
        "test_rows": len(split["test"]),
        "C": best_c,
        "answer_threshold": answer_threshold,
        "suggest_threshold": SUGGEST_THRESHOLD,
    }
    if x_test is not None:
        predicted = classifier.predict(x_test)
        confidence = classifier.predict_proba(x_test).max(axis=1)
        in_scope = y_test != OUT_OF_SCOPE
        answered = (confidence >= answer_threshold) & (predicted != OUT_OF_SCOPE)
        report.update({
            "test_accuracy": round(float(accuracy_score(y_test, predicted)), 4),
            "test_macro_f1": round(float(f1_score(y_test, predicted, average="macro")), 4),
            "in_scope_answered_correctly": round(float(((predicted == y_test) & answered)[in_scope].mean()), 4) if in_scope.any() else None,
            "out_of_scope_rejected": round(float((~answered)[~in_scope].mean()), 4) if (~in_scope).any() else None,
        })
    else:
        report["note"] = "No held-out questions yet. Add real questions to data/collected_questions.csv to get metrics."

    ARTIFACT_PATH.parent.mkdir(parents=True, exist_ok=True)
    dump({
        "classifier": classifier,
        "questions": questions,
        "encoder": ENCODER_MODEL,
        "answer_threshold": answer_threshold,
        "suggest_threshold": SUGGEST_THRESHOLD,
    }, ARTIFACT_PATH)
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
