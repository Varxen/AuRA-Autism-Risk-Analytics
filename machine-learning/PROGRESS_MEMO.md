# AuRA Machine Learning Progress Memo

**Updated:** 2026-10-25  
**Purpose:** Quick memory of current implementation, interim decisions, and open development questions. This memo supplements `docs/roadmap.md`; the roadmap remains the baseline for project status and planned work.

## Current phase status

| Stage | Status | Current boundary |
|---|---|---|
| 2.1 Text preprocessing | Implemented | Normalizes and tokenizes follow-up text while preserving the parent's original response. |
| 2.2 Lexicon matching | Implemented baseline | Uses the client's `behavioral_indicators_lexicon.json`; the current question selects the indicator. A match is lexical evidence only. |
| 2.3 Consistency and interpretation | Partially done | A backend-connected prototype checks the selected option against the follow-up and asks the parent to repeat both after contradiction or unclear text. Interpretation rules still need review and approval. |
| 2.4 Ordinal feature encoding | Implemented | Produces the shared ordered 13-value vector from accepted structured answers. Missing, duplicate, invalid, or incomplete answers cannot silently become zero. Legacy preview sessions do not receive a vector. |
| 3.1 Multi-model classification | Baseline trained | Logistic Regression, Random Forest, and XGBoost were trained on the current score-derived categories. Current results are accepted as an interim development output while more data is sought. |
| 3.2 Soft voting | Live inference observed | User confirmed a completed assessment displayed a category and soft-voting support percentages from the saved artifacts. Migration `20261025_08` is applied in the tested environment. History reload after navigation/refresh remains a separate persistence check. |
| Thesis Phase 4 | Planned; definition pending | Intended as NLP after ML to turn the model output into a clear explanation. Exact input, output, rules, and whether it can affect the category need client agreement. |
| Thesis Phase 5 | Planned; definition pending | Intended to assemble and present the result summary. It is a reporting/presentation phase unless the client defines additional analysis. |

## Decisions recorded

- Use the client's JSON as the working lexicon baseline. Do not describe it as clinically validated or as a validated cross-reference to screening instruments.
- Treat Stage 2.3 as **partially done** until the interpretation rules and representative examples are reviewed. Its current behavior is a prototype, not a clinical consistency judgment.
- For the current 2.2/2.3 baseline, keep question-scoped keyword/phrase matching and explicit interpretation rules. Future refinement: evaluate a context-aware NLP model that handles parent paraphrases, Filipino/Taglish/English wording, frequency, polarity and negation; use it to interpret the answer for the already-known question indicator, then compare with the selected response. Do not replace the baseline until labeled examples, client review, confidence handling and validation are agreed.
- For 2.4, use the 13 structured answers in questionnaire order:
  - Q1–Q9: `Always = 0`, `Sometimes = 1`, `Never = 2`.
  - Q10–Q13: `No = 0`, `Sometimes = 1`, `Yes = 2`.
- The follow-up text is currently used by 2.3 as a consistency check. It is not a feature in the 13-value vector.
- Q1 example clarified: “Minsan lumilingon, minsan hindi” with selected `Minsan` should pass. Added `lumilingon` variants as Q1 Filipino cues in the working lexicon; this local extension still needs client review.
- Intended overall sequence is pre-ML NLP (2.1-2.3) -> ML (3.1-3.2) -> post-ML NLP (Phase 4) -> result summary (Phase 5). Phase 4 and 5 are not implemented or finalized.
- The current live model returns the highest-support `Low`, `Moderate`, or `High` score-derived category. Displayed percentages are model support for those training labels, not probabilities of ASD.
- A live result has been observed in the UI. Do not record the individual assessment output in this memo; verify History restoration separately.
- Phase 4 may explain the model category, but must not change that category unless the client approves a defined rule and the study flow is revised.
- For the interim 3.1 baseline, use the `RAW DATA` worksheet only. Do not use the child's `Diagnosed`, `No Concern`, or `Not Evaluated` status as the model target.
- Use the workbook's `Ground Truth Labels` as **provisional score-derived categories**: Low 0–8, Moderate 9–11, High 12–26. These labels come from the same 13 scores used as features.
- The user has told the client that more data is needed and has agreed to accept the latest model output temporarily while that data is sought. This is an interim development decision, not clinical validation or final approval of the target-label method.
- 500 records per category was discussed as a reasonable preliminary balance target, not a statistically approved minimum. Any added records must be genuine, consented records collected under the same agreed protocol; do not duplicate or synthesize records to fill a class.
- Keep model artifacts and aggregate reports in ignored local folders. Do not copy parent IDs or free-text follow-ups into training outputs.

## Current 3.1 dataset and split

Source: `documentation/AURA-DATASET.xlsx`, `RAW DATA` worksheet. The loader includes rows with data-privacy consent marked `Yes`, validates all 13 score values, checks their sum against `TOTAL SCORE`, and checks the label against the workbook's preliminary cutoffs.

The current 500 consented records are distributed as follows:

| Category | Total records |
|---|---:|
| Low | 285 |
| Moderate | 88 |
| High | 127 |

The fixed-seed, stratified 70/15/15 split is:

| Category | Train | Validation | Test |
|---|---:|---:|---:|
| Low | 199 | 43 | 43 |
| Moderate | 62 | 13 | 13 |
| High | 89 | 19 | 19 |
| **Total** | **350** | **75** | **75** |

The test set was reserved from model comparison and tuning. Stage 3.2 used it once for final ensemble reporting.

## Latest validation output

All three models used the same 13 features and class order. Validation set only (`n = 75`):

| Model | Accuracy | Macro F1 |
|---|---:|---:|
| Logistic Regression | 94.67% | 0.9136 |
| Random Forest | 77.33% | 0.6483 |
| XGBoost | 82.67% | 0.7154 |

Moderate had only 13 validation examples. Moderate recall was 0.846 for Logistic Regression, 0.231 for Random Forest, and 0.308 for XGBoost. The report is `machine-learning/reports/stage_3_1_baseline.json`; the three trained artifacts are in `machine-learning/artifacts/` and are ignored by Git.

These metrics measure how closely the models reproduce the workbook's preliminary score cutoffs. They do **not** establish ASD-risk prediction or clinical validity. More records may stabilize per-class measurements, but more examples with the same score-derived labels still teach the cutoff rule.

## Stage 3.2 soft-voting output

`soft_voting.py` loads the three saved Stage 3.1 models, reuses the shared stratified split, averages their `predict_proba` outputs equally, and predicts the category with the largest mean probability. It reports validation and held-out test metrics. The report contains aggregate metrics only: `machine-learning/reports/stage_3_2_soft_voting.json`.

Run from repository root: `backend/.venv/Scripts/python.exe machine-learning/soft_voting.py`. This runs offline evaluation; the backend separately loads the same artifacts for live inference.

Validation (`n = 75`): accuracy **88.00%**, macro F1 **0.8057**. Confusion matrix, actual rows / predicted columns, ordered Low / Moderate / High:

```text
             Low  Moderate  High
Low           43         0     0
Moderate       3         7     3
High           0         3    16
```

Final held-out test (`n = 75`): accuracy **89.33%**, macro F1 **0.8537**. Confusion matrix, same order:

```text
             Low  Moderate  High
Low           41         2     0
Moderate       5         8     0
High           0         1    18
```

Test per-class recall: Low **0.953** (43), Moderate **0.615** (13), High **0.947** (19). Moderate remains the smallest class. Do not tune or select models based on these test metrics. Ensemble validation performance (88.00%) is below Logistic Regression alone (94.67%); soft voting is implemented as specified, not shown superior. Metrics still measure reproduction of score cutoffs, not ASD-risk prediction.

## Questions and work to revisit

### Stage 2.3 rule review

- Confirm how `expected_behavior` and `concerning_behavior` should map to present or absent behavior.
- Decide whether Stage 2.3 may infer a state without a `feature_term` match.
- Define handling for `rarely` / `bihira`, English, Filipino and Taglish frequency phrases, negation scope, likely typos, and overlapping positive/concern cues.
- Confirm the two-retry limit, blocked-item behavior, and reviewed expected outcomes for each question.
- Keep unanswered, unmatched, or unresolved responses from advancing or becoming a feature value without an approved rule.

### Data and labels

- Seek additional consented records, especially for Moderate; High is also smaller than Low. Re-check category counts after new data arrives.
- Ask a statistician or study adviser to justify the final sample size and split method. The 500-per-category target is only a working suggestion.
- Revisit whether score-derived categories are appropriate training targets. Since the target is calculated from the input vector, model training is a demonstration of formula reproduction, not independent learning of clinical outcomes.
- If the study needs an independent ML target, obtain an approved outcome-labeling protocol before changing targets or reporting clinical performance.

### Next pipeline steps

- Add genuine consented records, especially for Moderate. If dataset changes, repeat the full split/training/evaluation and preserve the current report as a historical result.
- Keep the held-out test report final for this dataset; do not tune from it.
- Confirm the proposed NLP-ML-NLP sequence with the client. Define Phase 4's input/output and whether it only explains the category; define Phase 5's result summary fields and presentation.
- Refine Stages 2.2/2.3 after the current keyword/rule baseline: assess a context-aware NLP model using reviewed parent-response examples and an explicit uncertain/clarification path.
- Update the flowchart and roadmap after client agreement, then implement Phases 4 and 5. Do not describe them as complete now.
- Verify that History restores a completed model result after navigation/refresh; restart the backend after retraining so it reloads the new artifacts.
- Prioritize improving and reviewing the Stage 2.2/2.3 keyword, phrase, context and consistency handling before treating those NLP stages as complete.
- Do not present model support as the probability that a child has ASD. Keep the interim category clearly labeled as score-derived and provisional.

## Useful implementation files

- `machine-learning/preprocess.py` — Stage 2.1.
- `machine-learning/lexicon_match.py` and `machine-learning/behavioral_indicators_lexicon.json` — Stage 2.2.
- `machine-learning/consistency.py` and `machine-learning/CONSISTENCY_RULES_DRAFT.md` — Stage 2.3 prototype and draft decisions.
- `machine-learning/feature_encoding.py` and `backend/aura_api/assessments.py` — Stage 2.4 encoding and completed-assessment API output.
- `machine-learning/prepare_dataset.py`, `models.py`, `train.py`, and `evaluate.py` — Stage 3.1 training pipeline.
- `machine-learning/inference.py`, `machine-learning/soft_voting.py`, and `backend/aura_api/assessments.py` — live Stage 3.2 inference and persisted model output.
- `docs/roadmap.md` — authoritative roadmap and baseline project status.
