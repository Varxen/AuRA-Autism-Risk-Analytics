"""Approved questionnaire snapshot and server-owned answer scoring rules."""

from typing import Literal

from .assessment_pipeline import score_answer

QUESTIONNAIRE_VERSION = "revised-pilot-testing-2-v1"
QUESTION_COUNT = 13
LANGUAGES = ("en", "fil")

_TEXT = {
    "en": [
        ("Response to Name", "How often does your child respond when you call their name?", "What usually happens when you call your child's name? Please describe how your child responds."),
        ("Eye Contact", "How often does your child make eye contact when talking to or interacting with you?", "What usually happens when your child makes eye contact with you while talking or interacting? Please describe."),
        ("Joint Attention", "When you point to something or look at something, how often does your child also look at it?", "What does your child usually do when you point to or look at something? Do they look at the same object?"),
        ("Use of Gestures", "How often does your child use gestures, such as pointing, waving, nodding, or shaking their head, to communicate?", "What gestures does your child usually use to communicate? Please give an example."),
        ("Social Interaction", "How often does your child interact with other children?", "How does your child usually interact with other children? Do they play with them, talk to them, or prefer to stay alone? Please describe."),
        ("Sharing Interest", "How often does your child show you something they are interested in or excited about?", "What does your child usually show you when they are interested or excited? Does your child look at you or wait for your reaction?"),
        ("Play Behavior", "How often does your child engage in pretend play, such as pretending to feed a doll, cook, or drive a toy car?", "What pretend activities does your child usually do? If your child does not usually engage in pretend play, what do they usually do when playing?"),
        ("Language and Communication", "Does your child usually express their needs, wants, or feelings using words, sounds, or gestures?", "How does your child usually communicate what they want or need? Approximately how many words or phrases can your child currently use?"),
        ("Understanding and Following Instructions", "Does your child usually follow simple instructions, such as ‘Come here,’ ‘Give me the toy,’ or ‘Sit down’?", "When you give your child a simple instruction, do you usually need to repeat it or use gestures before they follow it? Please give an example."),
        ("Repetitive Behaviors or Routines", "Does your child show repetitive movements or behaviors, such as hand-flapping, spinning, rocking, or repeating the same action?", "What repetitive movement or behavior does your child usually do? When does it usually happen, such as when your child is excited, upset, or stressed?"),
        ("Sensory Responses", "Does your child have a strong reaction to certain sounds, types of touch, or other sensations, such as covering their ears, crying, or avoiding them?", "What usually causes the reaction, and what does your child usually do? Please give an example."),
        ("Emotional Response to Change", "Does your child become upset when there is a change in their usual routine or when they are introduced to a new situation?", "What type of change usually upsets your child? For example, a change in schedule, going to a new place, or meeting a new person. How does your child usually react?"),
        ("Fixation/Preoccupation", "Is there an object or activity that your child really likes and wants to do or look at repeatedly?", "What object or activity is your child especially interested in? What does your child usually do with it, and do they have difficulty stopping or moving to another activity?"),
    ],
    "fil": [
        ("Pagtugon sa Pangalan", "Gaano kadalas tumutugon ang inyong anak kapag tinatawag ang kanyang pangalan?", "Pakilarawan kung paano karaniwang tumutugon ang inyong anak kapag siya ay tinatawag."),
        ("Pakikipagtinginan", "Gaano kadalas nakikipagtinginan ang inyong anak habang nakikipag-usap o nakikipag-ugnayan sa ibang tao?", "Pakilarawan kung paano siya karaniwang nakikipagtinginan sa panahon ng pakikipag-ugnayan."),
        ("Magkasanib na Atensyon", "Kapag may itinuturo o ipinakikita kayo, gaano kadalas itong tinitingnan ng inyong anak?", "Ano ang karaniwang ginagawa ng inyong anak kapag may itinuturo o ipinakikita sa kanya?"),
        ("Paggamit ng Kumpas", "Gaano kadalas gumagamit ang inyong anak ng mga kumpas, tulad ng pagturo, pagkaway, pagtango, o pag-iling, upang makipagkomunikasyon?", "Anu-anong uri ng kumpas ang madalas gamitin ng inyong anak sa pakikipagkomunikasyon?"),
        ("Pakikipag-ugnayan sa Iba", "Gaano kadalas nakikipaglaro o nakikipag-ugnayan ang inyong anak sa ibang mga bata?", "Pakilarawan kung paano siya karaniwang nakikipag-ugnayan sa kapwa bata."),
        ("Pagbabahagi ng Interes", "Gaano kadalas ibinabahagi ng inyong anak ang mga bagay o gawaing kinagigiliwan niya?", "Paano niya karaniwang ipinakikita o ibinabahagi ang kanyang interes sa iba?"),
        ("Paglalaro", "Gaano kadalas nakikilahok ang inyong anak sa kunwa-kunwariang laro o malikhaing paglalaro?", "Anong mga uri ng laro ang karaniwang nilalahukan ng inyong anak?"),
        ("Wika at Komunikasyon", "Nagagamit ba ng inyong anak ang salita, tunog, o kumpas upang maipahayag ang kanyang pangangailangan, nais, o damdamin?", "Pakilarawan kung paano niya karaniwang ipinahahayag ang kanyang sarili."),
        ("Pag-unawa at Pagsunod sa Panuto", "Gaano kadalas sumusunod ang inyong anak sa mga simpleng panuto?", "Kinakailangan pa bang ulitin o samahan ng kilos ang panuto upang ito ay kanyang masunod?"),
        ("Paulit-ulit na Kilos o Gawain", "Nagpapakita ba ang inyong anak ng mga paulit-ulit na kilos o gawain?", "Anu-anong paulit-ulit na kilos o gawain ang karaniwan niyang ipinakikita at kailan ito madalas nagaganap?"),
        ("Tugon sa mga Pandama", "Nagpapakita ba ang inyong anak ng matinding reaksiyon sa ilang tunog, paghawak, o iba pang sensori na karanasan?", "Pakilarawan ang mga sitwasyong nagdudulot ng ganitong reaksiyon at ang kanyang karaniwang tugon."),
        ("Emosyonal na Tugon sa Pagbabago", "Nagiging balisa o hindi komportable ba ang inyong anak kapag may pagbabago sa kanyang nakasanayang gawain o kapaligiran?", "Anong mga pagbabago ang karaniwang nakaaapekto sa kanya at paano siya tumutugon dito?"),
        ("Matinding Interes sa Bagay o Gawain", "Mayroon bang partikular na bagay o gawain na nagpapakita ng matindi at paulit-ulit na interes ang inyong anak?", "Pakilarawan ang bagay o gawaing ito at kung paano niya ipinakikita ang kanyang interes."),
    ],
}

_INDICATORS = (
    "response-to-name", "eye-contact", "joint-attention", "use-of-gestures",
    "social-interaction", "sharing-interest", "play-behavior", "language-and-communication",
    "understanding-and-following-instructions", "repetitive-behaviors-or-routines",
    "sensory-responses", "emotional-response-to-change", "fixation-preoccupation",
)


def get_questionnaire(language: Literal["en", "fil"], version: str = QUESTIONNAIRE_VERSION) -> list[dict]:
    if version != QUESTIONNAIRE_VERSION:
        raise ValueError("This questionnaire version is not available.")
    if language not in LANGUAGES:
        raise ValueError("Choose English or Tagalog.")
    labels = {"always": "Always", "sometimes": "Sometimes", "never": "Never", "yes": "Yes", "no": "No"}
    if language == "fil":
        labels = {"always": "Palagi", "sometimes": "Minsan", "never": "Hindi kailanman", "yes": "Oo", "no": "Hindi"}
    result = []
    for index, (indicator_label, main, follow_up) in enumerate(_TEXT[language], start=1):
        scale = (("always", 0), ("sometimes", 1), ("never", 2)) if index <= 9 else (("yes", 2), ("sometimes", 1), ("no", 0))
        result.append({
            "id": f"q{index}",
            "questionNumber": index,
            "indicatorId": _INDICATORS[index - 1],
            "indicatorLabel": indicator_label,
            "mainQuestion": main,
            "followUpQuestion": follow_up,
            "language": language,
            "questionnaireVersion": QUESTIONNAIRE_VERSION,
            "contentStatus": "approved",
            "options": [{"id": option_id, "label": labels[option_id], "score": score} for option_id, score in scale],
        })
    return result


def option_score(question_number: int, option_id: str) -> int:
    return score_answer(question_number, option_id)
