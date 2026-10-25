"""Question-scoped phrase matching for pipeline stage 2.2.

Matches lexical cues from the client-provided working lexicon. A match is not
a behavioral conclusion, consistency verdict, score, or clinical prediction.
"""

from __future__ import annotations

import json
from functools import lru_cache
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Mapping

from preprocess import PreprocessedText, preprocess_text

Language = Literal["en", "tl"]
_GROUPS = ("feature_terms", "positive_terms", "concern_terms", "negation_terms")
_DEFAULT_LEXICON_PATH = (
    Path(__file__).resolve().parent / "behavioral_indicators_lexicon.json"
)


@dataclass(frozen=True, slots=True)
class IndicatorLexicon:
    key: str
    feature_index: int
    category: str
    terms: Mapping[str, tuple[tuple[str, ...], ...]]


@dataclass(frozen=True, slots=True)
class LexiconMatch:
    question_number: int
    indicator_key: str
    indicator_category: str
    language: Language
    matched_terms: Mapping[str, tuple[str, ...]]

    @property
    def topic_mentioned(self) -> bool:
        """Whether any configured feature/topic anchor matched."""
        return bool(self.matched_terms["feature_terms"])


@lru_cache(maxsize=4)
def _load_lexicon(path: Path = _DEFAULT_LEXICON_PATH) -> tuple[IndicatorLexicon, ...]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"could not load behavioral lexicon: {path}") from error
    if not isinstance(raw, dict) or not raw:
        raise ValueError("behavioral lexicon must be a non-empty JSON object")

    entries: list[IndicatorLexicon] = []
    seen_indices: set[int] = set()
    for key, entry in raw.items():
        if not isinstance(entry, dict):
            raise ValueError(f"lexicon entry {key!r} must be an object")
        index = entry.get("feature_index")
        if not isinstance(index, int) or isinstance(index, bool) or index in seen_indices:
            raise ValueError(f"lexicon entry {key!r} has invalid or duplicate feature_index")
        seen_indices.add(index)

        language_terms: dict[str, dict[str, tuple[tuple[str, ...], ...]]] = {}
        for language in ("en", "tl"):
            groups = entry.get(language)
            if not isinstance(groups, dict):
                raise ValueError(f"lexicon entry {key!r} lacks {language!r} terms")
            language_terms[language] = {}
            for group in _GROUPS:
                phrases = groups.get(group)
                if not isinstance(phrases, list) or not all(isinstance(p, str) for p in phrases):
                    raise ValueError(f"lexicon entry {key!r} has invalid {language}.{group}")
                normalized = tuple(
                    tokens for phrase in phrases
                    if (tokens := preprocess_text(phrase).tokens)
                )
                language_terms[language][group] = normalized

        entries.append(IndicatorLexicon(
            key=key,
            feature_index=index,
            category=str(entry.get("category", "")),
            terms=language_terms,
        ))

    entries.sort(key=lambda item: item.feature_index)
    return tuple(entries)


def question_terms(question_number: int, language: Language, group: str) -> tuple[tuple[str, ...], ...]:
    """Return normalized phrases for one question and lexicon cue group."""
    if language not in ("en", "tl"):
        raise ValueError("language must be 'en' or 'tl'")
    entries = _load_lexicon()
    if not 1 <= question_number <= len(entries):
        raise ValueError(f"question_number must be between 1 and {len(entries)}")
    if group not in _GROUPS:
        raise ValueError(f"group must be one of: {', '.join(_GROUPS)}")
    return entries[question_number - 1].terms[language][group]


def match_question_text(
    question_number: int,
    text: str | PreprocessedText | None,
    language: Language,
    *,
    lexicon: tuple[IndicatorLexicon, ...] | None = None,
) -> LexiconMatch:
    """Match text only against lexicon entry assigned by question order.

    Phrases match contiguous whole tokens, avoiding substring hits such as
    ``look`` inside ``looking``. Overlapping cue groups are preserved as-is.
    """
    if language not in ("en", "tl"):
        raise ValueError("language must be 'en' or 'tl'")
    entries = lexicon if lexicon is not None else _load_lexicon()
    if not 1 <= question_number <= len(entries):
        raise ValueError(f"question_number must be between 1 and {len(entries)}")
    processed = text if isinstance(text, PreprocessedText) else preprocess_text(text)
    entry = entries[question_number - 1]

    matches: dict[str, tuple[str, ...]] = {}
    for group in _GROUPS:
        found = {
            " ".join(phrase_tokens)
            for phrase_tokens in entry.terms[language][group]
            if _contains_phrase(processed.tokens, phrase_tokens)
        }
        matches[group] = tuple(sorted(found))

    return LexiconMatch(
        question_number=question_number,
        indicator_key=entry.key,
        indicator_category=entry.category,
        language=language,
        matched_terms=matches,
    )


def _contains_phrase(tokens: tuple[str, ...], phrase: tuple[str, ...]) -> bool:
    if not phrase or len(phrase) > len(tokens):
        return False
    width = len(phrase)
    return any(tokens[start : start + width] == phrase for start in range(len(tokens) - width + 1))
