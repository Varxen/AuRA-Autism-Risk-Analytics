import type { QuestionnaireQuestion } from '../types/questionnaire.types'

// Main and follow-up wording transcribed verbatim from documentation/SQ-Translation-in-Filipino.docx.
// Indicator labels are interface translations; the DOCX contains question wording only.
export const filipinoQuestions: Record<string, Pick<QuestionnaireQuestion, 'indicatorLabel' | 'mainQuestion' | 'followUpQuestion'>> = {
  "q1": {
    "indicatorLabel": "Pagtugon sa Pangalan",
    "mainQuestion": "Gaano kadalas tumutugon ang inyong anak kapag tinatawag ang kanyang pangalan?",
    "followUpQuestion": "Pakilarawan kung paano karaniwang tumutugon ang inyong anak kapag siya ay tinatawag."
  },
  "q2": {
    "indicatorLabel": "Pakikipagtinginan",
    "mainQuestion": "Gaano kadalas nakikipagtinginan ang inyong anak habang nakikipag-usap o nakikipag-ugnayan sa ibang tao?",
    "followUpQuestion": "Pakilarawan kung paano siya karaniwang nakikipagtinginan sa panahon ng pakikipag-ugnayan."
  },
  "q3": {
    "indicatorLabel": "Magkasanib na Atensyon",
    "mainQuestion": "Kapag may itinuturo o ipinakikita kayo, gaano kadalas itong tinitingnan ng inyong anak?",
    "followUpQuestion": "Ano ang karaniwang ginagawa ng inyong anak kapag may itinuturo o ipinakikita sa kanya?"
  },
  "q4": {
    "indicatorLabel": "Paggamit ng Kumpas",
    "mainQuestion": "Gaano kadalas gumagamit ang inyong anak ng mga kumpas, tulad ng pagturo, pagkaway, pagtango, o pag-iling, upang makipagkomunikasyon?",
    "followUpQuestion": "Anu-anong uri ng kumpas ang madalas gamitin ng inyong anak sa pakikipagkomunikasyon?"
  },
  "q5": {
    "indicatorLabel": "Pakikipag-ugnayan sa Iba",
    "mainQuestion": "Gaano kadalas nakikipaglaro o nakikipag-ugnayan ang inyong anak sa ibang mga bata?",
    "followUpQuestion": "Pakilarawan kung paano siya karaniwang nakikipag-ugnayan sa kapwa bata."
  },
  "q6": {
    "indicatorLabel": "Pagbabahagi ng Interes",
    "mainQuestion": "Gaano kadalas ibinabahagi ng inyong anak ang mga bagay o gawaing kinagigiliwan niya?",
    "followUpQuestion": "Paano niya karaniwang ipinakikita o ibinabahagi ang kanyang interes sa iba?"
  },
  "q7": {
    "indicatorLabel": "Paglalaro",
    "mainQuestion": "Gaano kadalas nakikilahok ang inyong anak sa kunwa-kunwariang laro o malikhaing paglalaro?",
    "followUpQuestion": "Anong mga uri ng laro ang karaniwang nilalahukan ng inyong anak?"
  },
  "q8": {
    "indicatorLabel": "Wika at Komunikasyon",
    "mainQuestion": "Nagagamit ba ng inyong anak ang salita, tunog, o kumpas upang maipahayag ang kanyang pangangailangan, nais, o damdamin?",
    "followUpQuestion": "Pakilarawan kung paano niya karaniwang ipinahahayag ang kanyang sarili."
  },
  "q9": {
    "indicatorLabel": "Pag-unawa at Pagsunod sa Panuto",
    "mainQuestion": "Gaano kadalas sumusunod ang inyong anak sa mga simpleng panuto?",
    "followUpQuestion": "Kinakailangan pa bang ulitin o samahan ng kilos ang panuto upang ito ay kanyang masunod?"
  },
  "q10": {
    "indicatorLabel": "Paulit-ulit na Kilos o Gawain",
    "mainQuestion": "Nagpapakita ba ang inyong anak ng mga paulit-ulit na kilos o gawain?",
    "followUpQuestion": "Anu-anong paulit-ulit na kilos o gawain ang karaniwan niyang ipinakikita at kailan ito madalas nagaganap?"
  },
  "q11": {
    "indicatorLabel": "Tugon sa mga Pandama",
    "mainQuestion": "Nagpapakita ba ang inyong anak ng matinding reaksiyon sa ilang tunog, paghawak, o iba pang sensori na karanasan?",
    "followUpQuestion": "Pakilarawan ang mga sitwasyong nagdudulot ng ganitong reaksiyon at ang kanyang karaniwang tugon."
  },
  "q12": {
    "indicatorLabel": "Emosyonal na Tugon sa Pagbabago",
    "mainQuestion": "Nagiging balisa o hindi komportable ba ang inyong anak kapag may pagbabago sa kanyang nakasanayang gawain o kapaligiran?",
    "followUpQuestion": "Anong mga pagbabago ang karaniwang nakaaapekto sa kanya at paano siya tumutugon dito?"
  },
  "q13": {
    "indicatorLabel": "Matinding Interes sa Bagay o Gawain",
    "mainQuestion": "Mayroon bang partikular na bagay o gawain na nagpapakita ng matindi at paulit-ulit na interes ang inyong anak?",
    "followUpQuestion": "Pakilarawan ang bagay o gawaing ito at kung paano niya ipinakikita ang kanyang interes."
  }
}
