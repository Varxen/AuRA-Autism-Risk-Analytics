# AuRA machine-learning workspace

Pipeline workspace. Stage 2.1 preprocessing and the Stage 2.2 lexicon baseline remain available for reference and comparison. Live Stage 2.3 now uses the backend's loopback Ollama integration with Llama 3.2 3B by default; it returns consistent, contradiction or unclear and does not alter structured scores. This model integration is a prototype pending human-reviewed evaluation. Stage 2.4 returns one validated Q1–Q13 vector on real assessment completion. Stages 3.1 and 3.2 have a reproducible baseline training and soft-voting evaluation pipeline, and the backend uses their saved artifacts for live assessment inference.

## Stage 2.1 behavior

- Applies Unicode compatibility normalization and lowercase normalization.
- Normalizes apostrophe and dash variants, removes punctuation as token boundaries, and returns normalized text plus ordered tokens.
- Preserves negation and other words. It does not remove stop words, stem words, infer polarity or frequency, identify an indicator, or assign a score.
- Expands common English negative contractions (for example, `doesn't` to `does not`) so lexicon negation cues remain detectable.
- Does not store or change the parent's original response. The source response remains owned by the assessment record outside this module.

## Stage 2.2 behavior

- Loads `behavioral_indicators_lexicon.json` from this folder as the client-provided working lexicon.
- `match_question_text(question_number, text, language)` uses question order to select one indicator and checks only that indicator's English (`en`) or Filipino (`tl`) phrases.
- Matches contiguous whole tokens, not arbitrary substrings. Returns matching phrases grouped as `feature_terms`, `positive_terms`, `concern_terms`, and `negation_terms`.
- The lexicon includes common no-apostrophe forms such as `doesnt`; contractions such as `doesn't` normalize to `does not`.
- Keeps overlaps between groups. Conflicting lexical cues are reported together and not resolved.
- A match is lexical evidence only. It does not infer behavior, judge follow-up consistency, assign frequency, score an answer, or predict risk.
- Caller passes the selected language. Original response remains unchanged outside this module.

## Legacy Stage 2.3 lexicon rules

`consistency.py` documents the superseded rule-based prototype. The live API no longer calls it. Keep it for comparison and do not treat its decisions as the current assessment behavior.

## Live Stage 2.3 behavior

- The backend sends the approved question/indicator, selected answer and original follow-up text to the local Ollama model (`llama3.2:3b` by default).
- The model returns `consistent`, `contradiction` or `unclear` plus an exact contiguous evidence span. The span may include the full response when needed to preserve decisive context.
- The model checks meaning across English, Filipino and Taglish; the interface language is context, not a restriction on response wording.
- The model cannot change the selected answer, score, 13-value vector or ASD-risk category.
- Ollama must be available on loopback. Model/network errors do not save the response, consume a clarification attempt or fall back to keyword matching.
- The behavior remains a prototype. It needs human-reviewed examples, per-outcome evaluation and latency testing before it can be described as validated.

### Legacy rule details

The old lexicon details below describe the Stage 2.2 reference module, not the live Stage 2.3 decision path.

- `check_answer_consistency(question_number, selected_answer, follow_up_text, language)` checks follow-up text against the answer selected for the same item.
- Q1-Q9 accept `Always`/`Palagi`, `Sometimes`/`Minsan`, or `Never`/`Hindi kailanman`; Q10-Q13 accept `Yes`/`Oo`, `Sometimes`/`Minsan`, or `No`/`Hindi`.
- Uses the question's assigned lexicon cues and explicit frequency words in English or Filipino. Clear conflicts return `contradiction`; absent, overlapping, or conflicting cues return `unclear`.
- A one-character likely typo in a negation cue near a matched behavior cue is treated as `unclear`, never guessed as positive or negative.
- `consistent` is the only status that can continue. Both `contradiction` and `unclear` request the user to repeat the structured answer and follow-up together.
- Allows two clarification attempts after the first submission. Further unresolved answers return `stop_unresolved` and cannot continue to 2.4.
- This is a draft rule-based consistency gate, not validated clinical interpretation. It keeps lexical limitations visible and never changes the parent's original values or assigns scores.
- The assessment API calls this check before saving answer pairs. Non-consistent submissions stay in the visible chat during the current page session; accepted original answers are stored in PostgreSQL.

## Stage 2.4 behavior

- `feature_encoding.py` converts the accepted canonical option IDs into one Q1–Q13 ordered tuple.
- Q1–Q9 use `always=0`, `sometimes=1`, `never=2`. Q10–Q13 use `no=0`, `sometimes=1`, `yes=2`.
- The backend questionnaire scoring function delegates to this same mapping, so saved scores and the feature encoder cannot use separate rules.
- Missing, duplicate, out-of-range, or invalid answers raise an error. The encoder never fills a missing answer with zero.
- It uses structured choices only. Follow-up text is not currently part of the 13-value feature vector; Stage 2.3 remains a consistency gate.
- On completion, the assessment API returns the encoded vector for a real session. The frontend does not display it.
- Demo-preview answers do not receive a feature vector and must not be used as real training or prediction inputs.
- Training data preparation and live inference use the same 13-value ordered vector. The backend loads saved Stage 3.1 artifacts and applies the shared Stage 3.2 equal-weight soft-voting logic.
- Legacy fictional preview records are blocked from inference. Follow-up text is retained but is not a feature in this baseline.
- Results are provisional score-derived categories, not ASD probabilities or diagnosis.

## Stage 3.1 behavior

Run from this folder after installing `requirements.txt` with `python train.py`.

- Reads `RAW DATA` from `dataset/AURA-DATASET.xlsx` the `Low`, `Moderate`, and `High` worksheets from `dataset/AURA-DATASET-2.xlsx`, and `RAW DATA` from `dataset/AURA-DATASET-3.xlsx` (ID column `File Number Code` or `Parent/Respondent Code`).
- Combines consented records in memory. Reused respondent codes are scoped to their workbook and worksheet; the user confirmed they refer to different people across the new category sheets.
- Includes rows marked `Yes` for data privacy consent. It does not use the child-status field as a model target.
- Uses the existing Q1–Q13 score cells as features and checks that their sum matches `TOTAL SCORE`.
- Checks each `Ground Truth Labels` value against its category worksheet and the preliminary score cutoffs: Low 0–8, Moderate 9–11, High 12–26.
- Splits the records into stratified 70% training, 15% validation, and 15% test sets with a fixed random seed. Validation metrics support Stage 3.1 model comparison; Stage 3.1 does not inspect test metrics, reserving the test set for the final Stage 3.2 ensemble evaluation. Duplicate respondent codes stop preparation to prevent repeated records crossing the split.
- Trains Logistic Regression, Random Forest, and XGBoost on the same feature order and class order: Low, Moderate, High.
- Writes model artifacts and an aggregate metrics report under ignored `artifacts/` and `reports/` directories. It does not save raw responses, IDs, or row-level predictions.
- Prints a validation comparison table and saves `reports/stage_3_1_validation_dashboard.png` with metric comparison and per-model confusion matrices. Install requirements to enable chart generation.
- These labels are derived from the same 13 scores used as input. Metrics show how well models reproduce the preliminary arithmetic cutoffs, not independent clinical or ASD-risk prediction. Soft voting belongs to Stage 3.2.

The source workbooks contain respondent data and are ignored by Git. Keep local copies at the paths above; do not commit them.

## Stage 3.2 soft voting

Run from this folder with `python soft_voting.py` after Stage 3.1 has created model artifacts. From repository root, use `backend/.venv/Scripts/python.exe machine-learning/soft_voting.py` on Windows.

- Loads the three saved Stage 3.1 models and uses the same fixed-seed stratified split from `data_splits.py`.
- Averages each model's `predict_proba` values with equal weight in `Low`, `Moderate`, `High` order; the largest mean selects the predicted category.
- Prints validation and final held-out test accuracy, macro F1, confusion matrices, and per-class precision/recall/F1/support.
- Uses validation for a consistency check. Reports test results once as final ensemble evaluation; do not tune from test results.
- Saves aggregate metrics only to ignored `reports/stage_3_2_soft_voting.json`; does not save row predictions, IDs, or raw responses.
- Prints a validation/test comparison table and saves `reports/stage_3_2_soft_voting_dashboard.png` plus `reports/stage_3_2_soft_voting_dashboard_held_out_test.png` for metrics and confusion matrices.
- Outputs are support across provisional score-derived categories, not probabilities of ASD.

Because the provisional target is computed from the same 13 scores, any trained model would reproduce the scoring rule. It would not demonstrate independent clinical risk prediction.

## Information-chat intent classifier

`info_chat/` holds the model behind the information chat: the `bge-m3` encoder (run locally through Ollama, `ollama pull bge-m3`) embeds a message, and a Logistic Regression head trained on our own labelled questions picks one of the 53 knowledge-base intents, three small-talk intents (greeting, thanks, goodbye) or `none` (out of scope).

- `intents.json` – the 53 intents (ids `kb-01`…`kb-53`), exported from `frontend/src/data/informationKnowledgeBase.ts`.
- `data/collected_questions.csv` – real questions: `text,intent_id,source` (use `none` for out-of-scope). Split per intent 60/20/20 with a fixed seed.
- `data/paraphrases.csv` – `text,intent_id,seed_text`; used only when the seed question is in train, so held-out data never leaks.
- `python -m info_chat.train` (run from `machine-learning/`) writes `artifacts/info_chat_intent.joblib` and `reports/info_chat_metrics.json`.

Until `collected_questions.csv` has real rows, the model trains on the 106 knowledge-base questions only and reports no accuracy; the thresholds are defaults, not tuned. The backend serves it at `POST /api/v1/chats/intent`; the frontend falls back to keyword matching if that call fails.
