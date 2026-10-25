# AuRA Behavioral Lexicon Draft

**Status: client JSON accepted as the working baseline lexicon. Entries remain subject to review; this baseline is not clinically validated or connected to the application.**

## Purpose

The current questionnaire determines the active indicator. While the parent answers Q1, matching is limited to Response to Name. Use `machine-learning/behavioral_indicators_lexicon.json` as the source of truth for the current working lexicon. Keep its 13 bilingual indicator entries and phrase lists as the baseline; record proposed changes separately for client review.

The JSON is a draft lexicon, not a validated clinical resource. Its phrases and categories are client-provided and have not been independently validated. This draft does not add or claim clinical wording. It does not copy or claim equivalence to items from M-CHAT-R/F, Q-CHAT, or CSBS-DP ITC. The sources below were opened and reviewed for tool identity, broad coverage, and age range. They support a provisional topic cross-reference, not a validated equivalence between AuRA's questions and the instruments.

## Screening-tool references reviewed

| Tool | What the linked source identifies | Age range stated by the source | Relevance to AuRA |
|---|---|---|---|
| [CSBS DP Infant-Toddler Checklist](https://www.autismalert.org/uploads/PDF/SCREENING--DEVELOPMENTAL%20DELAY%20%26%20AUTISM--CCBS%20DP%20Infant-Toddler%20Checklist.pdf) | Caregiver checklist spanning emotion/eye gaze, communication, gestures, sounds, words, understanding, and object use. The PDF title says CSBS DP ITC; `CCBS` appears only in the URL filename. The PDF states copyright by Paul H. Brookes Publishing. | 6–24 months | Broad topic overlap for eye gaze, joint attention, gestures, communication, understanding, and play. Not a phrase lexicon and not an exact match for all 13 AuRA indicators. |
| [Q-CHAT](https://psychology-tools.com/test/qchat-quantitative-checklist-for-autism-in-toddlers) | Psychology Tools page describing a 25-item quantitative checklist; it cites the Allison et al. paper. The displayed topics include response to name, eye contact, pointing, pretend play, communication, repetitive behavior, sensory response, routines, and object interests. | 18–24 months | Broad topic overlap with several AuRA indicators. Confirm the canonical instrument version and reproduction permissions before using item-level content. |
| [M-CHAT-R/F](https://www.autismspeaks.org/screen-your-child) | Autism Speaks page identifies the 20-question M-CHAT-R/F and its follow-up process. Displayed topics overlap with joint attention, pretend play, gestures, response to name, social interest, sound response, eye contact, understanding instructions, and social referencing. | 16–30 months | Broad topic overlap with several AuRA indicators. Its follow-up procedure is a separate screening process, not the contradiction check proposed for AuRA. |

AuRA currently screens ages 12–36 months. These reference tools have narrower, differing age ranges; their validity does not automatically transfer to AuRA's full age range or its custom 13-question instrument. Confirm age eligibility and the approved item-to-indicator crosswalk with the study's reviewer.

## Provisional topic cross-reference

This is a reading aid based on broad topics shown on the linked sources. It is not an approved instrument equivalence or a clinical mapping. “No direct overlap noted” means the linked page did not show an obvious counterpart; it does not prove the full instrument lacks one.

| AuRA question | CSBS DP ITC | Q-CHAT | M-CHAT-R/F |
|---|---|---|---|
| Q1 Response to Name | Direct topic | Direct topic | Direct topic |
| Q2 Eye Contact | Eye-gaze domain | Direct topic | Direct topic |
| Q3 Joint Attention | Point/look together; shared attention | Follow gaze; pointing to share interest | Point/look together; follow gaze |
| Q4 Use of Gestures | Gesture domain | Simple gestures; pointing | Pointing; copying gestures |
| Q5 Social Interaction | No direct peer-interaction item noted | Social interaction is a stated domain | Interest in other children |
| Q6 Sharing Interest | Showing/sharing objects | Pointing to share interest | Showing objects to share |
| Q7 Play Behavior | Pretend play | Pretend play | Pretend play |
| Q8 Language and Communication | Sounds, words, and communication | Speech, words, and echoing | No direct expressive-language item noted |
| Q9 Understanding Instructions | Understanding words without gestures | No direct instruction-following item noted | Understanding spoken instructions |
| Q10 Repetitive Behaviors or Routines | No direct repetitive-behavior item noted | Repetitive actions/objects | Repetitive finger movements |
| Q11 Sensory Responses | No direct sensory-response item noted | Sensory response items | Response to everyday noise |
| Q12 Emotional Response to Change | Emotion item, but no direct routine-change item noted | Adapting to routine change | Social referencing in a new situation; not the same as routine-change response |
| Q13 Fixation/Preoccupation | Object use domain, but no direct fixation item noted | Interest in a small set of objects | No direct fixation item noted |

## Client JSON: `machine-learning/behavioral_indicators_lexicon.json` (source file formerly named `behavioral_indicators_0.7.6.3.json`)

The supplied JSON has 13 indicator keys, with zero-based `feature_index` values 0-12. Each entry has a category and English (`en`) and Filipino (`tl`) phrase lists: `feature_terms`, `positive_terms`, `concern_terms`, and `negation_terms`.

| Q / feature index | JSON indicator key | JSON category |
|---|---|---|
| 1 / 0 | `response_to_name` | `expected_behavior` |
| 2 / 1 | `eye_contact` | `expected_behavior` |
| 3 / 2 | `joint_attention` | `expected_behavior` |
| 4 / 3 | `gesture_use` | `expected_behavior` |
| 5 / 4 | `social_interaction` | `expected_behavior` |
| 6 / 5 | `sharing_interest` | `expected_behavior` |
| 7 / 6 | `play_behavior` | `expected_behavior` |
| 8 / 7 | `language_communication` | `expected_behavior` |
| 9 / 8 | `following_instructions` | `expected_behavior` |
| 10 / 9 | `repetitive_behaviors_routines` | `concerning_behavior` |
| 11 / 10 | `sensory_responses` | `concerning_behavior` |
| 12 / 11 | `emotional_response_to_change` | `concerning_behavior` |
| 13 / 12 | `fixated_restricted_interest` | `concerning_behavior` |

### Matching boundary and interpretation

- Match only against the indicator assigned to the current question. The question selects the topic; this lexicon should not choose a different ASD indicator.
- `feature_terms` are topic anchors. A hit only suggests that text mentions the current topic.
- `positive_terms`, `concern_terms`, and `negation_terms` are lexical cues, not validated behavior labels or a complete language-understanding method. They do not, by themselves, establish a positive/negative behavior, frequency, answer score, contradiction, or diagnosis.
- Do not equate `expected_behavior` with healthy/low-risk or `concerning_behavior` with ASD/high-risk. These are JSON category names that need the study team's definition.
- Lexicon matching does not assign 0/1/2. Questionnaire scoring and text interpretation are separate steps. Any comparison between them needs explicit, question-specific rules.
- The current prototype repeats both the structured answer and follow-up after a contradiction or unclear match. It allows two clarification retries, then blocks progression. This rule is implemented for demonstration and still needs study-team review; ambiguous or unmatched text does not produce a feature value.
- Preserve the parent's original answer and follow-up text. Do not replace them with a lexicon hit or inferred interpretation.
- Use the JSON phrases as supplied for review. Do not silently expand them or copy item wording from screening instruments.

### Initial review findings for the supplied JSON

These are implementation and review flags, not changes to the client's JSON:

1. Filipino `repetitive_behaviors_routines` contains `paulit ulit` in both `positive_terms` and `concern_terms`. One phrase therefore signals both polarities.
2. Broad cues such as `looks`, `responds`, `uses`, `avoids`, `hindi`, and `not` can match without enough context. Matching by simple substring can also produce false hits inside longer words or phrases.
3. Several concern phrases already contain negation (for example, `does not follow instructions` and `hindi sumusunod sa panuto`), while a separate negation list is also provided. The processing order and scope of negation are unspecified.
4. A phrase may be a topic cue but not enough evidence to determine whether behavior is present, absent, occasional, or frequent. Frequency and polarity rules remain undefined.
5. English and Filipino lists are present, but Taglish, spelling variants, punctuation, and normalization behavior are not specified.
6. `feature_index` is zero-based. Confirm that downstream code expects this indexing and that its order matches the approved questionnaire.

Use the supplied JSON as the lexicon baseline for development and review. Do not use its matches to assign scores or clinical classifications until the study team and qualified reviewer approve the interpretation rules.

## Decisions needed before implementation

1. Confirm the final indicator names, category meanings, zero-based feature indices, and question-to-indicator mapping with the approved questionnaire.
2. Cross-reference each AuRA indicator with exact items from each validated tool, including instrument version, source, age range, and any use/reproduction permission. Have the study's reviewer approve the mapping.
3. Have a qualified reviewer approve the supplied phrase lists, phrase expansion, Taglish variants, phrase types, normalization, negation scope, and context rules. Do not copy screening-tool item text into the lexicon without permission.
4. Specify question-specific polarity and frequency mappings for Q1-Q13. Confirm they agree with each question answer scale; JSON categories alone do not define these mappings.
5. Approve how unresolved matches and contradictions are handled, including how many clarification attempts are allowed.

Until these decisions are reviewed, treat this file as a working lexicon baseline only. Do not use it to produce a screening score or clinical result.
