# AuRA 2.3 Consistency Rules — Draft

**Status:** Legacy rule-based prototype, retained for comparison. The live API now uses a local Ollama model for Stage 2.3. These rules are not active runtime behavior and are not approved as final research or clinical interpretation rules.

This document records the current behavior in `consistency.py` and its connection to the assessment API. Update this document when the study team or reviewer approves changes.

## Purpose and boundary

Stage 2.3 compares the parent's structured answer with the free-text follow-up for the same question. It uses the question-scoped lexical cues from Stage 2.2 and a small set of explicit frequency phrases.

Stage 2.3 does not assign the structured score, change the parent's original answer, create a feature vector, or classify ASD risk. Only a `consistent` pair can be saved as an accepted answer and advance. A contradiction or unclear result asks the parent to repeat both the structured answer and follow-up.

## Current interpretation rules

### Lexical cues

- The current question selects one lexicon entry. Stage 2.3 checks that question's `positive_terms`, `concern_terms`, and `negation_terms`.
- `feature_terms` are returned by Stage 2.2 but are not currently required by Stage 2.3 to infer a behavior state.
- For `expected_behavior` items (Q1-Q9):
  - Concern cues without positive cues imply `absent`.
  - A negated positive cue implies `absent`.
  - Both positive and concern cues imply `unclear` unless the negated-positive rule above applies.
  - Positive cues alone imply `present`.
  - No interpretable cue implies `unclear`.
- For `concerning_behavior` items (Q10-Q13):
  - A negated positive cue implies `absent`.
  - Any positive or concern cue without that negation implies `present`.
  - No interpretable cue implies `unclear`.
- A negation phrase counts as modifying a cue when it appears before that cue with no more than three intervening tokens.
- A one-character insertion, deletion, substitution, or adjacent transposition in a single-word negation cue of at least four characters, within four tokens before a matched behavior cue, makes the result `unclear`. The system does not guess the intended word.

### Explicit frequency phrases

The current phrase buckets are:

- `high`: `always`, `every time`, `all the time`, `palagi`, `lagi`
- `sometimes`: `sometimes`, `occasionally`, `minsan`, `paminsan minsan`
- `none`: `never`, `not at all`, `never at all`, `hindi kailanman`, `di kailanman`
- `rarely`: `rarely`, `seldom`, `bihira`, `madalang`

If text contains phrases from multiple buckets, the frequency is `conflicting` and the result is `unclear`. The phrases `not always`, `hindi palagi`, and `di palagi` are treated as `sometimes`, not `high`.

### Comparison with selected answer

For Q1-Q9, the selected answer is interpreted as:

- `Always` / `Palagi` = `high`
- `Sometimes` / `Minsan` = `sometimes`
- `Never` / `Hindi kailanman` = `none`

Current checks:

- `Always` conflicts with explicit `sometimes`, `rarely`, or `none` frequency; it also conflicts with an inferred `absent` behavior state.
- `Never` conflicts with explicit `high`, `sometimes`, or `rarely` frequency; it also conflicts with an inferred `present` state.
- `Sometimes` conflicts with explicit `high` or `none` frequency. Explicit `rarely` returns `unclear` because it has no direct answer option. Without an explicit frequency conflict, either clear behavior state is accepted.

For Q10-Q13, the selected answer is interpreted as:

- `Yes` / `Oo` = behavior is present
- `Sometimes` / `Minsan` = behavior occurs sometimes
- `No` / `Hindi` = behavior is absent

Current checks:

- `No` conflicts with explicit `high`, `sometimes`, or `rarely` frequency; it also conflicts with an inferred `present` state.
- `Yes` conflicts with explicit `none` frequency; it also conflicts with an inferred `absent` state.
- `Sometimes` conflicts with explicit `none` frequency. Otherwise, either clear behavior state is accepted.

## Retry and storage behavior

- The first contradiction or unclear result requests a repeat of both answers.
- The system allows two clarification retries after the first submission.
- A third unresolved submission marks the current question blocked. The assessment cannot advance past it.
- Failed pairs remain visible in the current chat page session but are not saved as accepted assessment answers. Only a pair that passes the gate is stored in PostgreSQL.
- The accepted answer retains the original selected option and unmodified follow-up text. Score calculation remains separate.

## Examples under current rules

| Question | Selected answer | Follow-up | Current outcome |
|---|---|---|---|
| Q1 Response to Name | Always | “He doesn't respond to me.” | Contradiction; ask for both again |
| Q1 Response to Name | Never | “He doesn't respond to me.” | Consistent, if the lexicon matches the negated cue |
| Q1 Response to Name | Sometimes | “He sometimes responds when called.” | Consistent, if the lexicon matches the behavior cue |
| Q1 Response to Name | Sometimes | “Minsan lumilingon, minsan hindi.” | Consistent: `minsan` matches Sometimes; `lumilingon` is a Q1 Filipino response cue. The added cue is a working lexicon extension pending client review. |
| Q10 Repetitive Behaviors | No | “He repeats actions over and over.” | Contradiction, if the lexicon matches the behavior cue |
| Any item | Any option | No interpretable cue for the item's indicator | Unclear; ask for both again |
| Any item | Any option | Conflicting explicit frequency phrases | Unclear; ask for both again |

## Decisions for future review

- Confirm whether `expected_behavior` and `concerning_behavior` entries should imply the presence/absence rules above.
- Confirm that Stage 2.3 may infer a behavior state without a matched `feature_term`.
- Define how `rarely` and `bihira` relate to Always/Sometimes/Never or Yes/Sometimes/No.
- Review whether the explicit frequency phrase lists cover approved English, Filipino, and Taglish usage.
- Review the three-token negation scope and one-character typo rule against examples in both languages.
- Confirm whether overlapping `positive_terms` and `concern_terms` should always return `unclear`.
- Confirm the two-retry limit and the blocked-item behavior.
- Approve representative examples and expected outcomes for every question before using this gate for research results.

Until these points are reviewed, treat Stage 2.3 as a software prototype. Do not describe its interpretation as clinically validated.
