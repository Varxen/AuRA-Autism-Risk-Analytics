"""Fixed settings for the information-chat intent classifier."""

from pathlib import Path

HERE = Path(__file__).resolve().parent
INTENTS_PATH = HERE / "intents.json"
COLLECTED_PATH = HERE / "data" / "collected_questions.csv"
OUT_OF_SCOPE_SEED_PATH = HERE / "data" / "out_of_scope_seed.txt"
PARAPHRASES_PATH = HERE / "data" / "paraphrases.csv"
EMBED_CACHE_PATH = HERE / "data" / ".embed_cache.joblib"
ARTIFACT_PATH = HERE.parent / "artifacts" / "info_chat_intent.joblib"
REPORT_PATH = HERE.parent / "reports" / "info_chat_metrics.json"

OLLAMA_BASE_URL = "http://127.0.0.1:11434"
ENCODER_MODEL = "bge-m3"
OUT_OF_SCOPE = "none"

RANDOM_STATE = 42
# Per-intent share of collected questions: train / validation / test.
SPLIT_FRACTIONS = (0.6, 0.2, 0.2)
# Answer directly at or above this confidence; suggest related questions
# between SUGGEST_THRESHOLD and the answer threshold; otherwise fall back.
DEFAULT_ANSWER_THRESHOLD = 0.5
SUGGEST_THRESHOLD = 0.1
TARGET_ANSWER_PRECISION = 0.95
