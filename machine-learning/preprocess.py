"""Normalize and tokenize parent follow-up text for later pipeline stages."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

_TOKEN_PATTERN = re.compile(r"[^\W_]+(?:'[^\W_]+)*", flags=re.UNICODE)
_APOSTROPHE_TRANSLATION = str.maketrans({"’": "'", "‘": "'", "`": "'"})
_DASH_TRANSLATION = str.maketrans({
    "-": " ",
    "‐": " ",
    "‑": " ",
    "‒": " ",
    "–": " ",
    "—": " ",
    "−": " ",
})
_NEGATIVE_CONTRACTIONS = {
    "aren't": "are not",
    "can't": "can not",
    "couldn't": "could not",
    "didn't": "did not",
    "doesn't": "does not",
    "don't": "do not",
    "hadn't": "had not",
    "hasn't": "has not",
    "haven't": "have not",
    "isn't": "is not",
    "mustn't": "must not",
    "shouldn't": "should not",
    "wasn't": "was not",
    "weren't": "were not",
    "won't": "will not",
    "wouldn't": "would not",
}
_CONTRACTION_PATTERN = re.compile(r"\b(?:" + "|".join(
    re.escape(item) for item in sorted(_NEGATIVE_CONTRACTIONS, key=len, reverse=True)
) + r")\b")


@dataclass(frozen=True, slots=True)
class PreprocessedText:
    """Normalized text and its ordered tokens; source text stays elsewhere."""

    normalized_text: str
    tokens: tuple[str, ...]


def preprocess_text(text: str | None) -> PreprocessedText:
    """Normalize text and common English negative contractions without deleting meaning cues.

    This stage does not remove stop words, infer polarity or frequency, stem
    words, or assign an indicator. In particular, negation remains available
    for the later context and consistency rules.
    """
    if text is None:
        text = ""
    if not isinstance(text, str):
        raise TypeError("follow-up text must be a string or None")

    normalized = unicodedata.normalize("NFKC", text).casefold()
    normalized = normalized.translate(_APOSTROPHE_TRANSLATION)
    normalized = normalized.translate(_DASH_TRANSLATION)
    normalized = _CONTRACTION_PATTERN.sub(
        lambda match: _NEGATIVE_CONTRACTIONS[match.group(0)],
        normalized,
    )
    tokens = tuple(_TOKEN_PATTERN.findall(normalized))

    return PreprocessedText(
        normalized_text=" ".join(tokens),
        tokens=tokens,
    )
