"""Generate a short, non-diagnostic explanation of a model result."""

from __future__ import annotations

import json
import re
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from .config import Settings


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


class OllamaResultExplanation:
    """Explain local model-support shifts from structured indicator answers."""

    _SYSTEM_PROMPT = """You write a short, warm, parent-friendly explanation of AuRA's pre-assessment summary. AuRA is a developmental pre-screening research system, not a diagnostic tool.

Use only the selected summary level (Low, Moderate or High) and the fact that the parent's answers about their child's behaviors were compared with it. Explain in everyday words what the summary level means for the parent: it describes how the answers they shared compare with patterns seen in the training data, it is not a diagnosis, and a qualified health professional is the right person to talk to about any concern. Write for a parent with no technical background.

Never use technical words such as model, support, percentage point, sensitivity, reference answer, classifier, feature, probability or algorithm. Do not name individual behaviors; the page lists them separately. Do not repeat any number or percentage, mention another summary level, infer anything about the child, give medical advice, diagnose, or change the result.

Write two or three short, plain sentences in the requested language (English or Filipino/Tagalog). Return exactly one JSON object with exactly one string field named "explanation". No markdown or extra fields."""

    def __init__(self, settings: Settings):
        self.base_url = settings.ollama_base_url.rstrip("/")
        self.model = settings.consistency_model
        self.timeout_seconds = settings.consistency_timeout_seconds
        self._opener = build_opener(ProxyHandler({}), _NoRedirect())

    def explain(
        self,
        *,
        category: str,
        probabilities: dict[str, float],
        indicators: list[dict[str, str | float]],
        language: str,
    ) -> str:
        request_data = {
            "language": "Filipino/Tagalog" if language == "fil" else "English",
            "selected_category": category,
            "relative_model_support_percent": {
                name: round(value * 100, 1) for name, value in probabilities.items()
            },
            "indicator_support_changes_percentage_points": indicators,
            "reference": "replace this one answer with Sometimes; hold all other answers fixed",
            "minimum_reported_change_percentage_points": 1.0,
        }
        payload = json.dumps(
            {
                "model": self.model,
                "stream": False,
                "keep_alive": "5m",
                "format": "json",
                "options": {"temperature": 0, "num_predict": 260},
                "messages": [
                    {"role": "system", "content": self._SYSTEM_PROMPT},
                    {"role": "user", "content": json.dumps(request_data, ensure_ascii=False)},
                ],
            },
            ensure_ascii=False,
        ).encode("utf-8")
        request = Request(
            f"{self.base_url}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with self._opener.open(request, timeout=self.timeout_seconds) as response:
                raw_response = response.read(16_385)
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            raise RuntimeError("Ollama result explanation is unavailable.") from error

        if len(raw_response) > 16_384:
            raise ValueError("Ollama result explanation exceeded the response limit.")
        try:
            envelope = json.loads(raw_response)
            content = envelope["message"]["content"]
            if envelope.get("done") is not True or not isinstance(content, str):
                raise ValueError("Ollama returned an incomplete explanation.")
            result = json.loads(content)
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
            raise ValueError("Ollama returned malformed result explanation.") from error
        if not isinstance(result, dict) or set(result) != {"explanation"}:
            raise ValueError("Ollama returned unexpected explanation fields.")
        explanation = result["explanation"]
        if not isinstance(explanation, str):
            raise ValueError("Ollama explanation must be a string.")
        explanation = explanation.strip()
        if not explanation or len(explanation) > 700:
            raise ValueError("Ollama explanation was empty or too long.")
        other_categories = {"Low", "Moderate", "High"} - {category}
        if any(re.search(rf"\b{re.escape(name)}\b", explanation, re.IGNORECASE) for name in other_categories):
            raise ValueError("Ollama explanation mentioned a different category.")
        if re.search(r"\d|%", explanation):
            raise ValueError("Ollama explanation repeated numerical model output.")
        return explanation


def fallback_explanation(category: str, language: str, indicators: list[dict[str, str | float]]) -> str:
    if language == "fil":
        return (
            f"Ang buod na antas ng paunang pagtatasang ito ay {category}, batay sa mga sagot na ibinahagi ninyo tungkol sa "
            "pag-uugali ng inyong anak. Hindi ito diagnosis. Para sa anumang alalahanin, makabubuting kumonsulta sa isang "
            "kwalipikadong propesyonal sa kalusugan."
        )
    return (
        f"The summary level for this pre-assessment is {category}, based on the answers you shared about your child's "
        "behavior. This is not a diagnosis. If you have any concerns, it is best to talk with a qualified health professional."
    )


def recommendation_for_category(category: str, language: str) -> str:
    if language == "fil":
        if category == "Low":
            return (
                "Ipagpatuloy ang pagmamasid sa pag-unlad ng inyong anak. Kung nag-aalala pa rin kayo, "
                "maaari kayong kumonsulta sa isang kwalipikadong propesyonal sa kalusugan."
            )
        return (
            "Iminumungkahing talakayin ang inyong mga obserbasyon sa isang kwalipikadong propesyonal sa kalusugan "
            "para sa karagdagang gabay."
        )
    if category == "Low":
        return (
            "Continue observing your child's development. If you remain concerned, you may consult a qualified "
            "health professional."
        )
    return "Consider discussing your observations with a qualified health professional for further guidance."
