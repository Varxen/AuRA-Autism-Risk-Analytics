# AuRA Machine Learning Progress Memo

**Updated:** 2026-10-27
**Purpose:** Quick memory of current implementation, interim decisions, and open development questions. This memo supplements `docs/roadmap.md`; the roadmap remains the baseline for project status and planned work.

## Current phase status

| Stage | Status | Current boundary |
|---|---|---|
| 2.1 Text preprocessing | Implemented | Normalizes and tokenizes follow-up text while preserving the parent's original response. |
| 2.2 Lexicon matching | Implemented baseline | Uses the client's `behavioral_indicators_lexicon.json`; the current question selects the indicator. A match is lexical evidence only. |
| 2.3 Consistency and interpretation | Revised local-model prompt and approval flow implemented; evaluation pending | Backend sends the exact approved question, indicator, displayed follow-up, selected answer, permitted choices and parent response to Ollama/Llama 3.2 3B. The prompt includes follow-up intent and item-specific guidance for Q1-Q13. On clear contradiction, the model suggests an option; after parent approval, the backend saves that option and its server-calculated score without a second Ollama check, then advances. The user confirmed this works after restarting the backend. Human-reviewed evaluation remains open. |
| 2.4 Ordinal feature encoding | Implemented | Produces the shared ordered 13-value vector from accepted structured answers. Missing, duplicate, invalid, or incomplete answers cannot silently become zero. Legacy preview sessions do not receive a vector. |
| 3.1 Multi-model classification | Retrained on 2,900 records | The original 500 and additional 2,400 consented records are included. All labels remain score-derived. |
| 3.2 Soft voting | Re-evaluated; 97.48% held-out accuracy | Validation accuracy 98.39%; held-out test accuracy 97.48% on score-derived labels. Artifacts were regenerated locally; restart backend and verify a new live result. Migration `20261025_08` is applied in the tested environment. Restoring a saved result after navigation/refresh is verified. |
| Thesis Phase 4 | Planned; definition pending | Intended as NLP after ML to turn the model output into a clear explanation. Exact input, output, rules, and whether it can affect the category need client agreement. |
| Thesis Phase 5 | Planned; definition pending | Intended to assemble and present the result summary. It is a reporting/presentation phase unless the client defines additional analysis. |

## Decisions recorded

- Use the client's JSON as the working lexicon baseline. Do not describe it as clinically validated or as a validated cross-reference to screening instruments.
- Stage 2.2 lexicon matching remains available as a reference, but Stage 2.3 no longer uses it at runtime.
- Stage 2.3 now uses a loopback-only Ollama prototype (`llama3.2:3b`). It receives approved question/indicator, selected answer, permitted options and unmodified follow-up; returns `consistent`, `contradiction` or `unclear` with evidence. On clear contradiction it suggests another permitted answer. It cannot directly change or score the answer; after parent approval, the backend saves the suggested option and calculates its score, then advances without calling Ollama again. The user confirmed the approval flow works after restarting the backend. Model failure during the initial check saves nothing; there is no keyword fallback.
- The revised Stage 2.3 prompt interprets the exact displayed follow-up, with item-specific Q1-Q13 guidance, bilingual and Taglish support, concise example acceptance, and valid absence statements. It separates `unclear` from clear contradiction and consistency; it does not embed fixed parent-phrase mappings. The prompt is implemented but has not yet passed human-reviewed evaluation.
- Treat Stage 2.3 as an implemented prototype, not validated interpretation. Build a human-reviewed English/Filipino/Taglish test set; compare outcomes, suggestion accuracy, approval/edit rates, false acceptance/retry and latency before research use. Keep unclear results on the clarification path.
- For 2.4, use the 13 structured answers in questionnaire order:
  - Q1–Q9: `Always = 0`, `Sometimes = 1`, `Never = 2`.
  - Q10–Q13: `No = 0`, `Sometimes = 1`, `Yes = 2`.
- Follow-up rule: score 0 saves and advances without a follow-up or Stage 2.3 check; scores 1 and 2 require the follow-up consistency check. Scoring stays Q1-Q9 = 0/1/2 and Q10-Q13 = 2/1/0. Follow-up text is not a feature in the 13-value vector.
- Account-data policy agreed: retain linked data while the account is active; provide Settings > Delete Account with password re-entry as a second confirmation; erase all application data linked to the account. Database handling is developer-only. Settings account deletion is implemented with password confirmation, CSRF validation, session-cookie clearing and cascaded removal of linked application records. Verification: 30 backend auth tests passed, including wrong-password/CSRF rejection, successful deletion, cascade behavior and isolation of another account; frontend production build and ESLint passed on 2026-10-27. Backup erasure/retention rules remain open.
- Q1 example clarified: “Minsan lumilingon, minsan hindi” with selected `Minsan` should pass. Added `lumilingon` variants as Q1 Filipino cues in the working lexicon; this local extension still needs client review.
- Intended overall sequence is pre-ML NLP (2.1-2.3) -> ML (3.1-3.2) -> post-ML NLP (Phase 4) -> result summary (Phase 5). Phase 4 and 5 are not implemented or finalized.
- The current live model returns the highest-support `Low`, `Moderate`, or `High` score-derived category. Displayed percentages are model support for those training labels, not probabilities of ASD.
- A live result has been observed in the UI, and restoring a saved result after navigation/refresh is verified. Do not record the individual assessment output in this memo.
- The completed-assessment panel and model-support bars were restyled against `documentation/Questionnaire Complete_ AI Assessment Summary.png`. Support is shown as horizontal category/percentage bars, not ASD probabilities. The New Assessment action remains outside the summary card.
- Chat bubbles now size to message length within their width limit and have 12px by 14px inner padding. Assistant response containers are offset below the avatar.
- Backend request-origin checks and credentialed CORS now accept HTTPS origins on generated `*.trycloudflare.com` tunnel hosts dynamically. Use HTTPS; the local backend `.env` has Secure cookies enabled. Restart backend after the origin-code change.
- Phase 4 may explain the model category, but must not change that category unless the client approves a defined rule and the study flow is revised.
- For the interim 3.1 baseline, use consented records from `RAW DATA` and the added category worksheets. Do not use the child's `Diagnosed`, `No Concern`, or `Not Evaluated` status as the model target.
- Use the workbook's `Ground Truth Labels` as **provisional score-derived categories**: Low 0–8, Moderate 9–11, High 12–26. These labels come from the same 13 scores used as features.
- The additional 2,400-record workbook is now included with the original 500 records. The user accepts current model output as interim development output; this is not clinical validation or final approval of the target-label method.
- The combined pool exceeds the working 500-record-per-category target (Low 1,085; Moderate 888; High 927). This target is not a statistically approved minimum. Any future records must be genuine, consented, and not duplicate people.
- Keep model artifacts and aggregate reports in ignored local folders. Do not copy parent IDs or free-text follow-ups into training outputs.

## Current 3.1 training pool and split

Sources: `machine-learning/dataset/AURA-DATASET.xlsx` (`RAW DATA`) and `machine-learning/dataset/AURA-DATASET-2.xlsx` (`Low`, `Moderate`, `High`). The loader combines them in memory, includes rows with consent marked `Yes`, validates all 13 scores and their total, and checks each label against its sheet and the unchanged score cutoffs. The user confirmed that reused codes in the added workbook belong to different people; code checks are scoped to each source workbook and sheet.

The user ran Stage 3.1 and Stage 3.2 on 2026-10-27 using 2,900 consented records. Training scripts now print compact metric comparison tables and save aggregate PNG charts in the ignored reports folder; no row-level data is graphed or saved. The original 500 records used in preliminary cutoff computation remain included. The cutoffs were not recomputed.

| Category | Records | Train | Validation | Test |
|---|---:|---:|---:|---:|
| Low | 1,085 | 759 | 163 | 163 |
| Moderate | 888 | 621 | 133 | 134 |
| High | 927 | 649 | 139 | 139 |
| **Total** | **2,900** | **2,029** | **435** | **436** |

The split is fixed-seed stratified 70/15/15. The held-out test set was used once for final Stage 3.2 reporting; do not tune models from it.

## Stage 3.1 individual model validation

All models use the same Q1-Q13 score vector. These are validation metrics, not held-out test results:

| Model | Accuracy | Macro F1 |
|---|---:|---:|
| Logistic Regression | 100.00% | 1.0000 |
| Random Forest | 88.05% | 0.8756 |
| XGBoost | 89.66% | 0.8921 |

Logistic Regression's perfect score is consistent with learning the linear score-cutoff boundaries. The labels are computed from the same questionnaire scores supplied as features, so this result is rule reproduction, not independent ASD-risk prediction.

## Stage 3.2 equal-weight soft voting

`soft_voting.py` averages the three models' class probabilities equally, then selects the largest mean. It reports validation and held-out test metrics. The report stores aggregate metrics only at `machine-learning/reports/stage_3_2_soft_voting.json`.

Validation (`n = 435`): accuracy **98.39%**, macro F1 **0.9836**. Confusion matrix, actual rows / predicted columns, ordered Low / Moderate / High:

```text
             Low  Moderate  High
Low          162         1     0
Moderate       3       130     0
High           0         3   136
```

Held-out test (`n = 436`): accuracy **97.48%** (`425/436` correct), macro F1 **0.9744**. Confusion matrix, same order:

```text
             Low  Moderate  High
Low          159         4     0
Moderate       2       132     0
High           0         5   134
```

The small validation/test gap does not establish clinical generalization. These metrics measure reproduction of score-derived cutoffs, not ASD-risk accuracy, probability, or diagnosis. The backend needs a restart before checking live inference with the new local artifacts.
## Questions and work to revisit

### Stage 2.3 model evaluation

- Collect consented, de-identified response examples and have reviewers label consistency outcomes independently.
- Measure per-outcome precision/recall, false acceptance, false retry, invalid model output and inference latency on respondent-separated examples.
- Review the evidence-quote requirement, retry limit, unclear handling and blocked-item wording with the client.
- The UI now distinguishes clear contradictions, which show an answer suggestion with an approval button, from unclear responses, which ask the parent to clarify.
- After the parent approves a suggested answer, the saved structured answer updates to that option, shows an “Approved” / “Inaprubahan” mark, and advances. User confirmed this worked after restarting the backend.
- Confirm local Ollama/model setup on development machines. Do not claim clinical validity or production readiness from a successful API call.

### Account data and access policy

- Retain account-linked application data while the account remains active.
- Withdrawal is initiated by the user through Settings > Delete Account. Require a second confirmation with password re-entry, then erase all application data linked to the account.
- Database handling is limited to the developer.
- [x] Implement Settings account deletion with password confirmation, CSRF validation and cascade removal of linked application records.
- [x] Verify deletion with 30 backend auth tests; frontend production build and ESLint passed (2026-10-27).
- [ ] Define backup deletion/retention and production database access controls before release.

### Data and labels

- The combined pool now has 1,085 Low, 888 Moderate, and 927 High records. Re-check counts and consent if further records are added; obtain adviser guidance before setting a final sample-size target.
- Ask a statistician or study adviser to justify the final sample size and split method. The 500-per-category target is only a working suggestion.
- Revisit whether score-derived categories are appropriate training targets. Since the target is calculated from the input vector, model training is a demonstration of formula reproduction, not independent learning of clinical outcomes.
- If the study needs an independent ML target, obtain an approved outcome-labeling protocol before changing targets or reporting clinical performance.

### Next pipeline steps

- If the dataset changes, repeat the full split/training/evaluation and preserve this 2,900-record report as a historical result.
- Keep the held-out test report final for this dataset; do not tune from it.
- Confirm the proposed NLP-ML-NLP sequence with the client. Define Phase 4's input/output and whether it only explains the category; define Phase 5's result summary fields and presentation.
- Evaluate and refine the local context-aware Stage 2.3 model with reviewed parent-response examples; retain Stage 2.2 lexicon as a reference baseline.
- Update the flowchart and roadmap after client agreement, then implement Phases 4 and 5. Do not describe them as complete now.
- [x] Verify that History restores a completed model result after navigation/refresh. Restart the backend after retraining so it reloads new artifacts.
- Prioritize reviewed-example evaluation of the Stage 2.3 local model; keep Stage 2.2 keyword/phrase matching as a reference baseline.
- Do not present model support as the probability that a child has ASD. Keep the interim category clearly labeled as score-derived and provisional.

## Useful implementation files

- `machine-learning/preprocess.py` — Stage 2.1.
- `machine-learning/lexicon_match.py` and `machine-learning/behavioral_indicators_lexicon.json` — Stage 2.2.
- `backend/aura_api/consistency_model.py` and `backend/aura_api/assessments.py` — live Stage 2.3 model prototype; `machine-learning/CONSISTENCY_RULES_DRAFT.md` records legacy rules.
- `machine-learning/feature_encoding.py` and `backend/aura_api/assessments.py` — Stage 2.4 encoding and completed-assessment API output.
- `machine-learning/prepare_dataset.py`, `models.py`, `train.py`, and `evaluate.py` — Stage 3.1 training pipeline.
- `machine-learning/inference.py`, `machine-learning/soft_voting.py`, and `backend/aura_api/assessments.py` — live Stage 3.2 inference and persisted model output.
- `docs/roadmap.md` — authoritative roadmap and baseline project status.
