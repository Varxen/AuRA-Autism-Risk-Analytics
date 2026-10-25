"""Conservative stage 2.3 check between structured answers and follow-up text."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from lexicon_match import Language, LexiconMatch, match_question_text, question_terms
from preprocess import PreprocessedText, preprocess_text

MAX_CLARIFICATION_ATTEMPTS = 2


class ConsistencyStatus(StrEnum):
    CONSISTENT = "consistent"
    CONTRADICTION = "contradiction"
    UNCLEAR = "unclear"


class NextAction(StrEnum):
    CONTINUE = "continue"
    REPEAT_FREQUENCY_AND_FOLLOW_UP = "repeat_frequency_and_follow_up"
    STOP_UNRESOLVED = "stop_unresolved"


@dataclass(frozen=True, slots=True)
class ConsistencyResult:
    status: ConsistencyStatus
    next_action: NextAction
    question_number: int
    indicator_key: str
    selected_answer: str
    clarification_attempts_used: int
    max_clarification_attempts: int
    reason: str
    lexicon_match: LexiconMatch

    @property
    def may_continue(self) -> bool:
        return self.next_action is NextAction.CONTINUE


def check_answer_consistency(
    question_number: int,
    selected_answer: str,
    follow_up_text: str,
    language: Language,
    *,
    clarification_attempts_used: int = 0,
    max_clarification_attempts: int = MAX_CLARIFICATION_ATTEMPTS,
) -> ConsistencyResult:
    """Check only clear contradictions; unclear evidence cannot pass silently.

    Q1-Q9 expect Always/Sometimes/Never. Q10-Q13 expect Yes/Sometimes/No.
    A contradiction or unclear result requests both answers again. After the
    configured number of retries, the item remains unresolved and cannot pass.
    """
    if not isinstance(selected_answer, str):
        raise TypeError("selected_answer must be a string")
    if not isinstance(follow_up_text, str):
        raise TypeError("follow_up_text must be a string")
    if clarification_attempts_used < 0 or max_clarification_attempts < 0:
        raise ValueError("clarification attempt counts cannot be negative")

    normalized_answer = " ".join(preprocess_text(selected_answer).tokens)
    expected_behavior_question = question_number <= 9
    answer_map = (
        {
            "always": "high", "palagi": "high",
            "sometimes": "sometimes", "minsan": "sometimes",
            "never": "none", "hindi kailanman": "none",
        }
        if expected_behavior_question
        else {
            "yes": "present", "oo": "present",
            "sometimes": "sometimes", "minsan": "sometimes",
            "no": "none", "hindi": "none",
        }
    )
    if normalized_answer not in answer_map:
        valid = ", ".join(answer_map)
        raise ValueError(f"question {question_number} answer must be one of: {valid}")

    processed = preprocess_text(follow_up_text)
    match = match_question_text(question_number, processed, language)
    state, reason = _infer_behavior_state(processed, match)
    possible_negation_typo = _has_possible_negation_typo(processed, match)
    if possible_negation_typo:
        state = "unclear"
        reason = "Possible misspelling near a behavior cue; negation is unclear."
    status, status_reason = _compare(
        expected_behavior_question,
        answer_map[normalized_answer],
        processed,
        state,
    )
    if status_reason:
        reason = status_reason
    if possible_negation_typo and status is ConsistencyStatus.UNCLEAR:
        reason = "Possible misspelling near a behavior cue; negation is unclear."
    if status is ConsistencyStatus.CONSISTENT:
        action = NextAction.CONTINUE
    elif clarification_attempts_used < max_clarification_attempts:
        action = NextAction.REPEAT_FREQUENCY_AND_FOLLOW_UP
    else:
        action = NextAction.STOP_UNRESOLVED

    return ConsistencyResult(
        status=status,
        next_action=action,
        question_number=question_number,
        indicator_key=match.indicator_key,
        selected_answer=selected_answer,
        clarification_attempts_used=clarification_attempts_used,
        max_clarification_attempts=max_clarification_attempts,
        reason=reason,
        lexicon_match=match,
    )


def _infer_behavior_state(
    text: PreprocessedText,
    match: LexiconMatch,
) -> tuple[str, str]:
    """Infer only presence/absence cues, preserving unresolved overlaps."""
    positive = bool(match.matched_terms["positive_terms"])
    concern = bool(match.matched_terms["concern_terms"])
    negated_positive = positive and _cue_is_negated(text, match)

    if match.indicator_category == "expected_behavior":
        if concern and not positive:
            return "absent", "Matched concern cue for expected behavior."
        if negated_positive:
            return "absent", "Matched a negated expected-behavior cue."
        if positive and concern:
            return "unclear", "Matched both positive and concern cues."
        if positive:
            return "present", "Matched an expected-behavior cue."
        return "unclear", "No interpretable cue matched for this indicator."

    if negated_positive:
        return "absent", "Matched a negated concerning-behavior cue."
    if positive or concern:
        return "present", "Matched a concerning-behavior cue."
    return "unclear", "No interpretable cue matched for this indicator."


def _cue_is_negated(text: PreprocessedText, match: LexiconMatch) -> bool:
    tokens = text.tokens
    cue_phrases = {
        tuple(phrase.split())
        for group in ("positive_terms", "concern_terms")
        for phrase in match.matched_terms[group]
    }
    negation_phrases = {
        tuple(phrase.split()) for phrase in match.matched_terms["negation_terms"]
    }
    for cue in cue_phrases:
        for start in range(len(tokens) - len(cue) + 1):
            if tokens[start : start + len(cue)] != cue:
                continue
            for negation in negation_phrases:
                for neg_start in range(max(0, start - len(negation) - 3), start):
                    end = neg_start + len(negation)
                    if end <= start and start - end <= 3 and tokens[neg_start:end] == negation:
                        return True
    return False


def _has_possible_negation_typo(text: PreprocessedText, match: LexiconMatch) -> bool:
    cue_phrases = {
        tuple(phrase.split())
        for group in ("positive_terms", "concern_terms")
        for phrase in match.matched_terms[group]
    }
    negation_words = {
        phrase[0]
        for phrase in question_terms(match.question_number, match.language, "negation_terms")
        if len(phrase) == 1 and len(phrase[0]) >= 4
    }
    if not cue_phrases or not negation_words:
        return False

    for cue in cue_phrases:
        for start in range(len(text.tokens) - len(cue) + 1):
            if text.tokens[start : start + len(cue)] != cue:
                continue
            for word in text.tokens[max(0, start - 4) : start]:
                if len(word) >= 4 and any(_edit_distance_at_most_one(word, term) for term in negation_words):
                    return True
    return False


def _edit_distance_at_most_one(left: str, right: str) -> bool:
    """Detect one insertion, deletion, substitution, or adjacent transposition."""
    if left == right or abs(len(left) - len(right)) > 1:
        return False
    if len(left) == len(right):
        differences = [index for index, (a, b) in enumerate(zip(left, right)) if a != b]
        if len(differences) == 1:
            return True
        return (
            len(differences) == 2
            and differences[1] == differences[0] + 1
            and left[differences[0]] == right[differences[1]]
            and left[differences[1]] == right[differences[0]]
        )
    shorter, longer = (left, right) if len(left) < len(right) else (right, left)
    short_index = long_index = edits = 0
    while short_index < len(shorter) and long_index < len(longer):
        if shorter[short_index] == longer[long_index]:
            short_index += 1
            long_index += 1
        else:
            edits += 1
            long_index += 1
            if edits > 1:
                return False
    return True


def _compare(
    expected_behavior_question: bool,
    answer: str,
    text: PreprocessedText,
    inferred_state: str,
) -> tuple[ConsistencyStatus, str]:
    stated_frequency = _extract_frequency(text)
    if stated_frequency == "conflicting":
        return ConsistencyStatus.UNCLEAR, "Follow-up contains conflicting frequency cues."

    if expected_behavior_question:
        if answer == "high" and stated_frequency in {"sometimes", "rarely", "none"}:
            return ConsistencyStatus.CONTRADICTION, "Selected Always conflicts with stated follow-up frequency."
        if answer == "none" and stated_frequency in {"high", "sometimes", "rarely"}:
            return ConsistencyStatus.CONTRADICTION, "Selected Never conflicts with stated follow-up frequency."
        if answer == "sometimes" and stated_frequency in {"high", "none"}:
            return ConsistencyStatus.CONTRADICTION, "Selected Sometimes conflicts with stated follow-up frequency."
        if stated_frequency == "rarely" and answer == "sometimes":
            return ConsistencyStatus.UNCLEAR, "Rarely does not map cleanly to the available frequency options."

        if inferred_state == "unclear":
            return ConsistencyStatus.UNCLEAR, "Follow-up does not clearly describe this behavior."
        if answer == "high" and inferred_state == "absent":
            return ConsistencyStatus.CONTRADICTION, "Selected Always conflicts with an absent or reduced-behavior cue."
        if answer == "none" and inferred_state == "present":
            return ConsistencyStatus.CONTRADICTION, "Selected Never conflicts with a present-behavior cue."
        return ConsistencyStatus.CONSISTENT, "Follow-up cues do not conflict with the selected frequency."

    if answer == "none" and stated_frequency in {"high", "sometimes", "rarely"}:
        return ConsistencyStatus.CONTRADICTION, "Selected No conflicts with stated behavior occurrence."
    if answer == "present" and stated_frequency == "none":
        return ConsistencyStatus.CONTRADICTION, "Selected Yes conflicts with stated non-occurrence."
    if answer == "sometimes" and stated_frequency == "none":
        return ConsistencyStatus.CONTRADICTION, "Selected Sometimes conflicts with stated non-occurrence."
    if inferred_state == "unclear":
        return ConsistencyStatus.UNCLEAR, "Follow-up does not clearly describe this behavior."
    if answer == "none" and inferred_state == "present":
        return ConsistencyStatus.CONTRADICTION, "Selected No conflicts with a present-behavior cue."
    if answer == "present" and inferred_state == "absent":
        return ConsistencyStatus.CONTRADICTION, "Selected Yes conflicts with an absent-behavior cue."
    return ConsistencyStatus.CONSISTENT, "Follow-up cues do not conflict with the selected answer."


def _extract_frequency(text: PreprocessedText) -> str | None:
    tokens = text.tokens
    phrases = {
        "high": ("always", "every time", "all the time", "palagi", "lagi"),
        "sometimes": ("sometimes", "occasionally", "minsan", "paminsan minsan"),
        "none": ("never", "not at all", "never at all", "hindi kailanman", "di kailanman"),
        "rarely": ("rarely", "seldom", "bihira", "madalang"),
    }
    found = {
        kind
        for kind, candidates in phrases.items()
        if any(_contains(tokens, tuple(candidate.split())) for candidate in candidates)
    }

    # Explicit "not always" means less than always; do not count "always" alone.
    if _contains(tokens, ("not", "always")) or _contains(tokens, ("hindi", "palagi")) or _contains(tokens, ("di", "palagi")):
        found.discard("high")
        found.add("sometimes")
    if not found:
        return None
    if len(found) > 1:
        return "conflicting"
    return next(iter(found))


def _contains(tokens: tuple[str, ...], phrase: tuple[str, ...]) -> bool:
    if not phrase or len(phrase) > len(tokens):
        return False
    return any(tokens[start : start + len(phrase)] == phrase for start in range(len(tokens) - len(phrase) + 1))
