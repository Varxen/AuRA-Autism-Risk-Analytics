// Bilingual Q&A transcribed from documentation/info_chat_knowledge_base_data.pdf.
export interface KnowledgeBaseEntry {
  questionEn: string
  answerEn: string
  questionTl: string
  answerTl: string
  sources: string[]
}

export const informationKnowledgeBase: KnowledgeBaseEntry[] = [
  {
    "questionEn": "What is ASD?",
    "answerEn": "Autism Spectrum Disorder (ASD) is a developmental condition that affects how a person communicates, interacts, learns, and behaves.",
    "questionTl": "Ano ang ASD?",
    "answerTl": "Ang Autism Spectrum Disorder (ASD) ay isang kondisyon sa neurodevelopment na maaaring makaapekto sa paraan ng pakikipag-usap, pakikisalamuha, pagkatuto, at pag-uugali ng isang tao.",
    "sources": [
      "WHO (2025)",
      "NIMH",
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "Why is autism called a spectrum?",
    "answerEn": "Autism is called a spectrum because each person may have different characteristics, strengths, challenges, and support needs.",
    "questionTl": "Bakit tinatawag na spectrum ang autism ?",
    "answerTl": "Spectrum ang tawag dahil iba-iba ang katangian, kalakasan, hirap, at kailangang tulong ng bawat batang may ASD.",
    "sources": [
      "WHO (2025)",
      "NIMH"
    ]
  },
  {
    "questionEn": "What are the main characteristics of ASD?",
    "answerEn": "ASD may involve differences in social communication and interaction, as well as repeated behaviors, strong interests, a need for routines, or differences in sensory responses.",
    "questionTl": "Ano ang mga pangunahing katangian ng ASD?",
    "answerTl": "Maaaring iba ang paraan ng pakikipag-usap at pakikisama ng taong may ASD. Maaari rin siyang may paulit-ulit na ginagawa, matinding hilig sa isang bagay, gusto laging pareho ang routine, o may mas matindi o mas mahinang pagtugon sa tunog, ilaw, paghipo, at iba pang pandama .",
    "sources": [
      "WHO (2025)",
      "NIMH",
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "What are the signs of ASD?",
    "answerEn": "Possible signs include not always responding to their name, using fewer gestures, limited pointing, differences in eye contact or facial expression, repeated movements or speech, strong interest in certain topics, and difficulty with changes in routine.",
    "questionTl": "Ano ang mga posibleng senyales ng ASD?",
    "answerTl": "Ilan sa mga posibleng senyales ay hindi laging lumilingon kapag tinatawag sa pangalan, bihirang gumamit ng kumpas o magturo, may mga pagkakaiba sa eye contact o ekspresyon ng mukha, paulit-ulit na galaw o salita, matinding hilig sa ilang bagay, at hirap kapag nagbabago ang nakasanayang gawain.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Does every child with ASD have the same signs?",
    "answerEn": "No. Children with ASD may show different signs. A child may not show all of the possible signs.",
    "questionTl": "Pare-pareho ba ang senyales ng lahat ng batang may ASD?",
    "answerTl": "Hindi. Iba-iba ang senyales ng mga batang may ASD. Hindi rin kailangan makita sa isang bata ang lahat ng posibleng senyales.",
    "sources": [
      "CDC signs",
      "NIMH"
    ]
  },
  {
    "questionEn": "Can ASD affect a child's senses?",
    "answerEn": "Yes. A child may be more or less sensitive to sounds, light, touch, smell, taste, pain, or temperature.",
    "questionTl": "Nakakaapekto ba ang ASD sa senses ng bata?",
    "answerTl": "Oo. Maaaring sobrang sensitibo o hindi gaanong sensitibo ang bata sa tunog, ilaw, hawak, amoy, lasa, sakit, o init at lamig.",
    "sources": [
      "CDC signs",
      "NIMH"
    ]
  },
  {
    "questionEn": "Do children with ASD have strengths?",
    "answerEn": "Yes. Some children with ASD may have strengths in areas such as memory, attention to detail, music, mathematics, art, or other skills.",
    "questionTl": "May mga kalakasan ba ang mga batang may ASD?",
    "answerTl": "Oo. May ilang batang may ASD na magaling sa pag-alala, sa pagpansin ng maliliit na detalye, sa musika, sa math, sa sining, o sa iba pang bagay.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Is ASD lifelong?",
    "answerEn": "Yes. ASD is lifelong. Abilities and needs can change over time.",
    "questionTl": "Habambuhay ba ang ASD?",
    "answerTl": "Oo, habambuhay ang ASD. Pero puwedeng magbago ang kakayahan at kailangan ng tao habang tumatagal.",
    "sources": [
      "WHO (2025)",
      "NIMH"
    ]
  },
  {
    "questionEn": "What are restricted or repetitive patterns?",
    "answerEn": "These may include repetitive movements or speech, repeated ways of playing, strong preference for routines, distress with change, highly focused interests, or unusual focus on parts of objects.",
    "questionTl": "Ano ang ibig sabihin ng paulit-ulit na gawi sa ASD?",
    "answerTl": "Kasama rito ang paulit-ulit na galaw o salita, paulit-ulit na paraan ng paglalaro, matinding hilig sa routine, nababahala kapag may nagbago, matindi o lubos na nakatuong interes sa ilang partikular na bagay, paksa, o sobrang pagtutok sa isang bahagi ng bagay.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What are the social attention characteristics of ASD?",
    "answerEn": "Reduced social reciprocity, inconsistent response to name, limited shared enjoyment, less imitation, reduced joint attention, or less interest in peers.",
    "questionTl": "Ano ang mga katangian ng ASD pagdating sa pakikisama at atensyon?",
    "answerTl": "Hindi gaanong nakikipagpalitan ng reaksyon o tugon sa iba, hindi laging lumilingon kapag tinatawag sa pangalan, bihirang magpakita ng saya sa iba, bihirang manggaya, maaaring mahirapang sumunod sa direksiyon ng tingin o pagtuturo ng ibang tao upang ibahagi ang atensyon sa isang bagay (joint attention o pinagsasaluhang atensyon), o hindi gaanong interesado sa ibang bata.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What are the communication characteristics of ASD?",
    "answerEn": "Fewer gestures, limited pointing to request or share, delayed words, loss of previously used language, echolalia, or an unusual rhythm or tone of speech.",
    "questionTl": "Ano ang mga katangian ng ASD pagdating sa pakikipag-usap?",
    "answerTl": "Kakaunti ang kumpas, bihirang magturo para humingi o magpakita ng gusto, late magsalita, nawawala ang mga salitang dati nang nasasabi, inuulit ang narinig na salita (echolalia), o kakaiba ang tono at ritmo ng pagsasalita.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What are the play and learning characteristics of ASD?",
    "answerEn": "Repetitive object use, lining up or spinning items, close focus on parts, limited pretend play, or strong memory and interest in selected material.",
    "questionTl": "Ano ang mga katangian ng ASD pagdating sa laro at pagkatuto?",
    "answerTl": "Paulit-ulit na paggamit ng laruan, pagpila o pag-ikot ng mga gamit, sobrang pagtutok sa isang bahagi ng laruan, bihirang magkunwaring naglalaro (pretend play), o matalas na memorya at matinding interes sa ilang bagay.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What are the flexibility and regulation characteristics of ASD?",
    "answerEn": "Distress with transitions, need for predictability, intense interests, or difficulty regulating emotion.",
    "questionTl": "Ano ang mga katangian ng ASD pagdating sa pagbabago ng gawain at emosyon?",
    "answerTl": "Nahihirapan o nababahala kapag lumilipat sa ibang gawain, kailangan ng maayos na routine, matinding interes sa isang bagay, o nahihirapang kontrolin ang emosyon.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What are the sensory, movement, and daily living characteristics?",
    "answerEn": "High or low sensory responses, repetitive movements, coordination differences, or differences in feeding, sleep, dressing, toileting, and safety awareness.",
    "questionTl": "Ano ang mga katangian ng ASD pagdating sa senses, galaw, at araw-araw na gawain?",
    "answerTl": "Sobra o kulang ang reaksyon sa senses, paulit-ulit na galaw, hirap sa koordinasyon ng katawan, o may pagkakaiba sa paraan ng pagkain, pagtulog, pagbibihis, pagpunta sa banyo, at pag-iingat para hindi masaktan.",
    "sources": [
      "CDC signs",
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Is there one standard intervention for ASD?",
    "answerEn": "There is no single standard intervention for everyone. A plan should be strengths-based, family-centered, developmentally appropriate, and focused on meaningful participation and quality of life.",
    "questionTl": "May iisang tamang therapy o tulong ba para sa lahat ng may ASD?",
    "answerTl": "Wala. Iba-iba ang kailangan ng bawat bata. Dapat nakabase ang plano sa kakayahan ng bata, kasama ang pamilya, bagay sa edad at antas ng pag-unlad niya, at nakatuon sa pagsali niya sa araw-araw na gawain at sa magandang kalidad ng buhay.",
    "sources": [
      "WHO (2025)",
      "CDC support",
      "NICE CG170",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What supports may be used for ASD?",
    "answerEn": "Depending on assessed needs: parent-mediated developmental or social-communication intervention, behavioral approaches, speech-language therapy or augmentative and alternative communication, occupational therapy, educational supports, physical therapy, and psychological or medical care for co-occurring conditions.",
    "questionTl": "Anong mga tulong ang puwedeng gamitin para sa ASD?",
    "answerTl": "Depende sa kailangan ng bata: tulong na pinangungunahan ng magulang para sa pag-unlad at pakikipag-usap, behavioral approaches, speech therapy o ibang paraan ng komunikasyon (tulad ng larawan o device), occupational therapy, tulong sa pag-aaral, physical therapy, at psychologist o doktor para sa iba pang kondisyon.",
    "sources": [
      "CDC support",
      "NICE CG170",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Can intervention help at any age?",
    "answerEn": "Early support can be helpful, but intervention at any age may provide benefit.",
    "questionTl": "Makakatulong ba ang therapy o tulong sa anumang edad?",
    "answerTl": "Maaaring mas makakatulong kung maaga, pero puwede ring makinabang ang tao sa anumang edad.",
    "sources": [
      "WHO (2025)",
      "CDC support"
    ]
  },
  {
    "questionEn": "What should I ask to specialist about an intervention?",
    "answerEn": "Ask specialist about goals, evidence, risks, cost, progress measurement, and whether an approach respects the child's communication, comfort, dignity, and autonomy.",
    "questionTl": "Ano ang dapat kong itanong sa espesyalista tungkol sa therapy o tulong?",
    "answerTl": "Itanong kung ano ang layunin nito, ano ang ebidensiya, may panganib ba, magkano, at paano susukatin kung umuusad ang bata. Itanong din kung iginagalang nito ang paraan ng pakikipag-usap, ginhawa, dignidad, at kagustuhan ng bata.",
    "sources": [
      "NICE CG170",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Is autism contagious?",
    "answerEn": "No. Autism is not contagious and cannot be passed from one person to another.",
    "questionTl": "Nakakahawa ba ang autism?",
    "answerTl": "Hindi. Hindi nakakahawa ang autism at hindi ito naipapasa sa ibang tao.",
    "sources": [
      "WHO (2025)",
      "NIMH"
    ]
  },
  {
    "questionEn": "Is autism caused by poor parenting?",
    "answerEn": "No. Autism is not caused by parenting style.",
    "questionTl": "Dahil ba sa maling pagpapalaki ng magulang kaya nagkakaroon ng autism?",
    "answerTl": "Hindi. Hindi sanhi ng paraan ng pagpapalaki ng magulang ang autism.",
    "sources": [
      "WHO (2025)",
      "NIMH"
    ]
  },
  {
    "questionEn": "Is there a cure for ASD?",
    "answerEn": "There is no single cure or one intervention for everyone. Individualized supports can improve communication, adaptive functioning, health, participation, and quality of life.",
    "questionTl": "May lunas ba ang ASD?",
    "answerTl": "Walang iisang lunas o iisang paraan na bagay sa lahat. Pero nakakatulong ang tulong na bagay sa bata para gumanda ang pakikipag-usap, ang kaya niyang gawin sa araw-araw, ang kalusugan, ang pakikisali sa mga gawain, at ang kalidad ng buhay niya.",
    "sources": [
      "WHO (2025)",
      "CDC support"
    ]
  },
  {
    "questionEn": "Can girls be autistic?",
    "answerEn": "Yes. ASD occurs across sexes and genders. Some children, including girls and those with subtler characteristics, may be recognized later.",
    "questionTl": "Puwede bang magkaroon ng autism ang mga babae?",
    "answerTl": "Oo. Nangyayari ang ASD sa lahat, lalaki man o babae. May mga bata, lalo na ang mga babae o ang mga hindi gaanong halata ang senyales, na mas huli nang napapansin.",
    "sources": [
      "NIMH",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Does one behavior prove ASD?",
    "answerEn": "No. No single behavior proves ASD, and an",
    "questionTl": "Napapatunayan na bang may ASD ang",
    "answerTl": "Hindi. Walang iisang ugali na nagpapatunay ng ASD, at hindi rin",
    "sources": [
      "CDC signs",
      "NIMH"
    ]
  },
  {
    "questionEn": "Is there a medication that cures ASD?",
    "answerEn": "Medication does not cure ASD or treat all core characteristics. A qualified clinician may prescribe medication for a specific co-occurring symptom or condition and should monitor benefits and adverse effects.",
    "questionTl": "May gamot ba para gumaling ang ASD?",
    "answerTl": "Hindi. Hindi mapapagaling ng gamot ang ASD, at hindi rin nito natatanggal ang lahat ng katangian ng ASD. Puwedeng magreseta ang kwalipikadong doktor ng gamot para sa isang partikular na sintomas o kondisyong kasabay nito, at dapat niyang bantayan kung nakakatulong ito at kung may masamang epekto.",
    "sources": [
      "WHO (2025)",
      "CDC support",
      "NICE CG170"
    ]
  },
  {
    "questionEn": "What is autism screening?",
    "answerEn": "Autism screening is a short and organized check used to identify whether a child may need further evaluation. It does not diagnose ASD.",
    "questionTl": "Ano ang autism screening?",
    "answerTl": "Ang autism screening ay isang paunang pagsusuri upang matukoy kung may mga palatandaang nangangailangan ng mas masusing pagtatasa sa pag-unlad ng bata. Hindi ito katumbas ng diagnosis ng ASD.",
    "sources": [
      "CDC screening"
    ]
  },
  {
    "questionEn": "When is autism screening recommended?",
    "answerEn": "The American Academy of Pediatrics recommends autism-specific screening at 18 and 24 months. Screening may also be done earlier or repeated when there are concerns.",
    "questionTl": "Kailan dapat gawin ang autism screening?",
    "answerTl": "Ayon sa American Academy of Pediatrics, dapat may paunang pagsusuri ang batang edad 18 at 24 na buwan para sa autism. Puwede rin itong gawin nang mas maaga o ulitin kung may nag-aalala.",
    "sources": [
      "CDC screening",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What is M-CHAT-R/F?",
    "answerEn": "M-CHAT-R/F is a 20-item questionnaire completed by parents. It is used to screen children from 16 to 30 months of age.",
    "questionTl": "Ano ang M-CHAT-R/F?",
    "answerTl": "Ang M-CHAT-R/F ay listahan ng 20 tanong na sinasagutan ng magulang. Ginagamit ito para i-screen ang mga batang 16 hanggang 30 buwang gulang.",
    "sources": [
      "Robins et al.",
      "M-CHAT official",
      "CDC screening"
    ]
  },
  {
    "questionEn": "What is Q-CHAT?",
    "answerEn": "Q-CHAT is a 25-item questionnaire for caregivers. It was studied for children between 18 and 24 months of age.",
    "questionTl": "Ano ang Q-CHAT?",
    "answerTl": "Ang Q-CHAT ay listahan ng 25 tanong para sa magulang o nag-aalaga sa bata. Pinag-aralan ito sa mga batang 18 hanggang 24 na buwang gulang.",
    "sources": [
      "Allison et al."
    ]
  },
  {
    "questionEn": "What is the general developmental screening schedule?",
    "answerEn": "The American Academy of Pediatrics recommends general developmental screening at 9, 18, and 30 months and autism-specific screening at 18 and 24 months. Screen sooner or again when concerns or higher likelihood are present.",
    "questionTl": "Kailan ginagawa ang general developmental screening?",
    "answerTl": "Ayon sa American Academy of Pediatrics, dapat gawin ang general developmental screening sa 9, 18, at 30 buwan, at autism screening sa 18 at 24 na buwan. Puwede itong gawin nang mas maaga o ulitin kung may nag-aalala o mas mataas ang tsansa.",
    "sources": [
      "CDC screening",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What is the CSBS DP Infant-Toddler Checklist?",
    "answerEn": "It is a broad social-communication screener for younger children. Its validated use focuses on early functional communication development.",
    "questionTl": "Ano ang CSBS DP Infant-Toddler Checklist?",
    "answerTl": "Isa itong screening checklist para sa mas batang mga bata na tumitingin sa pakikipag-usap at pakikisama. Napatunayan na gumagana ito sa pagtingin sa maagang pag-unlad ng komunikasyon.",
    "sources": [
      "Wetherby et al."
    ]
  },
  {
    "questionEn": "What is developmental surveillance?",
    "answerEn": "At routine visits, health professionals should listen to caregiver concerns, review developmental history, observe the child, and track progress in communication, play, movement, learning, and daily skills.",
    "questionTl": "Ano ang developmental surveillance?",
    "answerTl": "Sa regular na check-up, dapat makinig ang health professional sa alalahanin ng magulang o nag-aalaga sa bata, balikan ang history ng pag-unlad ng bata, pagmasdan ang bata, at bantayan ang pag-unlad niya sa pakikipag-usap, paglalaro, paggalaw, pagkatuto, at araw-araw na gawain.",
    "sources": [
      "CDC screening",
      "CDC services",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "When can ASD be detected?",
    "answerEn": "Many children show noticeable developmental differences by 12-18 months. ASD may sometimes be detected at 18 months or younger, and a diagnosis by an experienced professional around age 2 can be reliable.",
    "questionTl": "Kailan puwedeng makita o matukoy ang ASD?",
    "answerTl": "Maraming bata ang may nakikitang pagkakaiba sa pag-unlad pagdating ng 12 hanggang 18 buwan. Maaaring matukoy ang ASD sa edad na 18 buwan o mas bata pa, at maaasahan ang diagnosis ng may karanasang propesyonal pagdating ng mga dalawang taong gulang.",
    "sources": [
      "CDC screening",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Does a negative screening result mean my child cannot have ASD?",
    "answerEn": "No. A negative result does not remove the need for further evaluation when concerns continue.",
    "questionTl": "Kapag negatibo ang resulta ng screening, hindi na ba puwedeng magkaroon ng ASD ang anak ko?",
    "answerTl": "Hindi ganoon. Kahit negatibo ang resulta, kung nag-aalala ka pa rin, kailangan pa rin ng karagdagang pagsusuri.",
    "sources": [
      "CDC screening",
      "M-CHAT official"
    ]
  },
  {
    "questionEn": "Does a positive screening result mean my child has ASD?",
    "answerEn": "No. A positive screening result means that further evaluation may be needed. It does not confirm ASD.",
    "questionTl": "Kapag positibo ang resulta ng screening, may ASD na ba ang anak ko?",
    "answerTl": "Hindi. Ang positibong resulta ng screening ay nangangahulugang maaaring kailanganin ang karagdagang pagtatasa. Hindi nito kinukumpirma na may ASD ang bata.",
    "sources": [
      "CDC screening",
      "M-CHAT official"
    ]
  },
  {
    "questionEn": "Should intervention wait until diagnosis?",
    "answerEn": "Not always. Support for an identified delay, such as speech-language intervention, may begin while diagnostic evaluation is pending.",
    "questionTl": "Kailangan bang hintayin muna ang diagnosis bago simulan ang therapy?",
    "answerTl": "Hindi palagi. Maaaring simulan ang pagtatasa at pagbibigay ng suporta para sa natukoy na delay, tulad ng speech therapy, habang hinihintay pa ang resulta ng pagsusuri.",
    "sources": [
      "CDC services"
    ]
  },
  {
    "questionEn": "What should parents do if they have concerns?",
    "answerEn": "Do not wait for a scheduled screening visit if a child loses skills or a caregiver is worried. Evaluation and support for a specific delay, such as speech-language intervention, may begin before an ASD diagnosis is completed.",
    "questionTl": "Ano ang dapat gawin ng magulang kapag nag-aalala sila?",
    "answerTl": "Huwag nang hintayin ang nakatakdang screening kung may nawala sa kakayahan ng bata sa gawain o nag-aalala ang magulang. Puwedeng magsimula ang pagsusuri at tulong para sa isang partikular na delay, tulad ng speech therapy, kahit hindi pa tapos ang diagnosis ng ASD.",
    "sources": [
      "CDC screening",
      "CDC services",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "How is ASD diagnosed?",
    "answerEn": "Diagnosis includes information from parents or caregivers, the child's developmental history, professional observation, medical and family history, and other assessments when needed.",
    "questionTl": "Paano dina-diagnose ang ASD?",
    "answerTl": "Kasama sa diagnosis ang kwento ng magulang o nag-aalaga sa bata, kung paano siya lumaki at natuto, pagmamasid ng propesyonal, medical history at history ng pamilya, at iba pang pagsusuri kung kailangan.",
    "sources": [
      "CDC diagnosis",
      "DSM-5-TR",
      "NICE CG128"
    ]
  },
  {
    "questionEn": "Does speech delay automatically mean ASD?",
    "answerEn": "No. Speech delay can have different causes. ASD evaluation looks at the child's overall pattern of communication and behavior.",
    "questionTl": "Autism na ba agad kapag late magsalita ang bata?",
    "answerTl": "Hindi. Maraming puwedeng dahilan ng delay sa pagsasalita. Sa pagsusuri ng ASD, tinitingnan ang kabuuang pattern ng pakikipag-usap at pag-uugali ng bata.",
    "sources": [
      "CDC diagnosis",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What do clinicians look for under the DSM-5-TR framework?",
    "answerEn": "The pattern must include persistent differences in all three social-communication/interaction areas and at least two of four restricted/repetitive behavior categories. Characteristics begin during development, cause meaningful functional impact, and are not better explained by global developmental delay or intellectual disability alone.",
    "questionTl": "Ano ang tinitingnan ng mga doktor ayon sa DSM-5-TR?",
    "answerTl": "Kailangang may patuloy na pagkakaiba sa lahat ng tatlong bahagi ng pakikipag-usap at pakikisama, at sa hindi bababa sa dalawa sa apat na uri ng paulit-ulit na gawi. Nagsisimula ito habang lumalaki ang bata, malaki ang epekto sa araw-araw na buhay, at hindi ito mas maipapaliwanag ng global developmental delay o intellectual disability lang.",
    "sources": [
      "DSM-5-TR",
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "Can a chatbot diagnose ASD?",
    "answerEn": "No. A chatbot cannot diagnose ASD. Diagnosis requires a complete evaluation by qualified professionals.",
    "questionTl": "Puwede bang i-diagnose ng chatbot ang ASD?",
    "answerTl": "Hindi. Hindi kayang i-diagnose ng chatbot ang ASD. Kailangan ng kumpletong pagsusuri mula sa mga kwalipikadong propesyonal.",
    "sources": [
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "Can an online test or chatbot diagnose ASD?",
    "answerEn": "No. It may only flag possible concern. Diagnosis requires a comprehensive professional evaluation using multiple sources of information.",
    "questionTl": "Puwede bang i-diagnose ng online test o chatbot ang ASD?",
    "answerTl": "Hindi. Maaari lang nitong ituro na may posibleng dapat bantayan. Kailangan ng kumpletong pagsusuri ng propesyonal na gumagamit ng iba't ibang pinagkukunan ng impormasyon.",
    "sources": [
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "Is there a blood test or brain scan for ASD?",
    "answerEn": "No. There is no single diagnostic test. There is no blood test, brain scan, checklist, or chatbot that can diagnose ASD by itself.",
    "questionTl": "May blood test o brain scan ba para sa ASD?",
    "answerTl": "Walang iisang blood test o brain scan na ginagamit upang mag-diagnose ng ASD. Hindi rin sapat ang checklist o chatbot lamang upang makapagbigay ng diagnosis.",
    "sources": [
      "CDC diagnosis"
    ]
  },
  {
    "questionEn": "What is AuRA's role?",
    "answerEn": "AuRA is educational pre-screening or decision support only. It must not diagnose, replace validated administration and scoring, or replace professional clinical judgment.",
    "questionTl": "Ano ang papel ng AuRA?",
    "answerTl": "Ang AuRA ay isang kasangkapan para sa paunang pagsusuri at suporta sa pagpapasya. Hindi ito nagbibigay ng diagnosis, hindi ito kapalit ng wastong paggamit at pagmamarka ng mga validated screening tool, at hindi nito pinapalitan ang klinikal na pagpapasya ng kwalipikadong propesyonal.",
    "sources": [
      "CDC diagnosis",
      "M-CHAT official"
    ]
  },
  {
    "questionEn": "Who can evaluate a child for ASD?",
    "answerEn": "Depending on the child's needs, evaluation may involve a pediatrician, child neurologist, psychologist, psychiatrist, speech-language pathologist, occupational therapist, audiologist, or other qualified professionals.",
    "questionTl": "Sino ang puwedeng mag-evaluate sa bata para sa ASD?",
    "answerTl": "Depende sa kailangan ng bata, puwedeng kasama sa pagsusuri ang pediatrician, child neurologist, psychologist, psychiatrist, speech-language pathologist, occupational therapist, audiologist, o iba pang kwalipikadong propesyonal.",
    "sources": [
      "CDC diagnosis",
      "NICE CG128"
    ]
  },
  {
    "questionEn": "What are the risk factors for ASD?",
    "answerEn": "Factors linked with a higher chance of ASD include having an autistic sibling or parent, certain genetic conditions, older parental age, very low birth weight, premature birth, and some pregnancy or birth-related factors.",
    "questionTl": "Ano ang mga risk factor ng ASD?",
    "answerTl": "Ang mga nakikitang may kaugnayan sa mas mataas na tsansa ng ASD ay ang may kapatid o magulang na may autism, ilang genetic condition, mas matandang edad ng magulang, napakababang timbang ng sanggol nang ipanganak, maagang panganganak (premature), at ilang nangyari sa pagbubuntis o panganganak.",
    "sources": [
      "NIMH",
      "WHO (2025)"
    ]
  },
  {
    "questionEn": "What causes ASD?",
    "answerEn": "There is no single cause that explains every autistic person. Genetic factors contribute substantially, and many genetic and developmental pathways may be involved.",
    "questionTl": "Ano ang sanhi ng ASD?",
    "answerTl": "Walang iisang sanhi na nagpapaliwanag sa lahat ng batang may ASD. Malaki ang papel ng genetics, at maraming genetic at developmental na dahilan ang maaaring may kinalaman.",
    "sources": [
      "NIMH",
      "WHO (2025)"
    ]
  },
  {
    "questionEn": "Do vaccines cause autism?",
    "answerEn": "Current evidence does not support MMR vaccination as a cause of autism. A large nationwide cohort and WHO's evidence review found no increased autism risk from MMR vaccination.",
    "questionTl": "Sanhi ba ng autism ang bakuna?",
    "answerTl": "Ayon sa kasalukuyang ebidensya, hindi sanhi ng autism ang bakunang MMR. Sa isang malaking pag-aaral sa buong bansa at sa pagsusuri ng WHO sa mga ebidensya, walang nakitang mas mataas na tsansa ng autism dahil sa bakunang MMR.",
    "sources": [
      "WHO (2025)",
      "Hviid et al."
    ]
  },
  {
    "questionEn": "Does having a risk factor mean my child has ASD?",
    "answerEn": "No. A risk factor does not mean that a child will develop ASD. Some children with risk factors do not develop ASD, while some children with ASD may not have an identified risk factor.",
    "questionTl": "Kapag may risk factor ang anak ko, magkakaroon ba siya ng ASD?",
    "answerTl": "Hindi. Hindi ibig sabihin na magkakaroon ng ASD ang bata dahil may risk factor siya. May mga batang may risk factor na hindi nagkakaroon ng ASD, at may mga batang may ASD na walang natukoy na risk factor.",
    "sources": [
      "NIMH",
      "WHO (2025)"
    ]
  },
  {
    "questionEn": "Is a risk factor the same as a cause?",
    "answerEn": "No. A risk factor is not proof of causation. Many children with a risk factor do not develop ASD, and many autistic children have no single identifiable risk factor.",
    "questionTl": "Pareho ba ang risk factor at sanhi?",
    "answerTl": "Hindi. Hindi patunay ng sanhi ang risk factor. Maraming batang may risk factor ang hindi nagkakaroon ng ASD, at maraming batang may autism ang walang natukoy na iisang risk factor.",
    "sources": [
      "NIMH",
      "WHO (2025)"
    ]
  },
  {
    "questionEn": "When should I consult a professional?",
    "answerEn": "You may talk to a pediatrician or qualified child-development professional whenever you have concerns about your child's development.",
    "questionTl": "Kailan ako dapat kumonsulta sa propesyonal?",
    "answerTl": "Puwede kang kumonsulta sa pediatrician o sa kwalipikadong propesyonal sa pag-unlad ng bata kahit kailan ka nag-aalala, kahit hindi pa dumarating ang susunod na nakatakdang screening.",
    "sources": [
      "CDC services",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What signs may require further evaluation?",
    "answerEn": "Further evaluation may be needed if a child loses skills, rarely responds to their name, uses few gestures, does not point to share interest, has significant language delay, or has repeated or sensory behaviors that affect daily activities.",
    "questionTl": "Anong mga senyales ang dapat ipasuri sa propesyonal?",
    "answerTl": "Maaaring kailanganin ang karagdagang pagsusuri kung nawawala ang dating kaya nang gawin ng bata, bihira siyang lumingon sa pangalan, kakaunti ang kumpas, hindi siya nagtuturo para ipakita ang gusto o interes, malaki ang delay sa pagsasalita, o may paulit-ulit o sensory na kilos na nakakaabala sa araw-araw na gawain.",
    "sources": [
      "CDC signs",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "What happens after consulting a professional?",
    "answerEn": "A professional may check the child's hearing, language, development, medical condition, and whether an ASD-focused evaluation is needed.",
    "questionTl": "Ano ang mangyayari pagkatapos kumonsulta sa propesyonal?",
    "answerTl": "Maaaring tingnan ng propesyonal ang pandinig, pagsasalita, pag-unlad, at kalagayang medikal ng bata, at kung kailangan ng pagsusuri para sa ASD.",
    "sources": [
      "CDC services",
      "AAP (2020)"
    ]
  },
  {
    "questionEn": "Where can Filipino families start?",
    "answerEn": "Families may start by consulting a pediatrician, family physician, local health center, or developmental-behavior al pediatrician. They may also ask about available school or local government services.",
    "questionTl": "Saan puwedeng magsimula ang mga pamilyang Pilipino?",
    "answerTl": "Puwedeng magsimula sa pediatrician, family doctor, health center sa inyong lugar, o developmental-behavior al pediatrician. Puwede ring magtanong tungkol sa mga serbisyong available sa paaralan o sa lokal na pamahalaan.",
    "sources": [
      "CDC services",
      "AAP (2020)",
      "RA 11650"
    ]
  }
]
