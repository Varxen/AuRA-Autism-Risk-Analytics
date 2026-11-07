"""Localized, non-diagnostic result text."""


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
