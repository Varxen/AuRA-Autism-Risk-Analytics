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

    _SYSTEM_PROMPT = """You explain AuRA's model output to a parent. AuRA is a developmental pre-screening research system, not a diagnostic tool.

Use only the selected category and listed structured indicator answers with their model-support changes. A positive change means replacing that answer with Sometimes, while holding all other answers fixed, lowers support for the selected category. A negative change means it raises support. Changes are local model sensitivity, not causes, clinical findings, or proof about the child. Do not name indicators or behaviors; the UI shows the exact indicator and answer list separately. Do not repeat numerical values or percentages, mention another category, infer anything about the child, give medical advice, diagnose, or change the result.

Write one or two short, plain-language sentences in the requested language (English or Filipino/Tagalog) explaining that listed responses shifted support compared with a Sometimes reference answer. If no indicators are listed, state that no individual answer shifted support by the reporting threshold. Return exactly one JSON object with exactly one string field named "explanation". No markdown or extra fields."""

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
                "options": {"temperature": 0, "num_predict": 180},
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
        if not explanation or len(explanation) > 600:
            raise ValueError("Ollama explanation was empty or too long.")
        other_categories = {"Low", "Moderate", "High"} - {category}
        if any(re.search(rf"\b{re.escape(name)}\b", explanation, re.IGNORECASE) for name in other_categories):
            raise ValueError("Ollama explanation mentioned a different category.")
        if re.search(r"\d|%", explanation):
            raise ValueError("Ollama explanation repeated numerical model output.")
        return explanation


def fallback_explanation(category: str, language: str, indicators: list[dict[str, str | float]]) -> str:
    if not indicators:
        if language == "fil":
            return (
                "Walang indibidwal na sagot na nagbago sa suporta ng modelo nang hindi bababa sa isang percentage point "
                "kumpara sa sagot na Minsan, habang pareho ang iba pang sagot. Hindi ito klinikal na sanhi."
            )
        return (
            "No individual answer changed model support by at least one percentage point compared with a Sometimes "
            "answer while holding the other answers fixed. This is not a clinical cause."
        )
    if language == "fil":
        return (
            f"Ang mga nakalistang sagot ang may pinakamalaking pagbabago sa suporta ng {category} kumpara sa sagot na Minsan, "
            "habang pareho ang iba pang sagot. Pagbabago ito sa output ng modelo, hindi klinikal na sanhi."
        )
    return (
        f"The listed answers produced the largest shifts in support for {category} compared with a Sometimes answer, "
        "with the other answers held fixed. This is a change in model output, not a clinical cause."
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
