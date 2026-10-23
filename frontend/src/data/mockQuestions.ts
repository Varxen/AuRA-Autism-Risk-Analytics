import { filipinoQuestions } from './filipinoQuestions.ts'
import type { AssessmentLanguage, QuestionnaireQuestion } from '../types/questionnaire.types'

export const QUESTIONNAIRE_VERSION = 'revised-pilot-testing-2-v1'
export const QUESTION_COUNT = 13

// Wording transcribed from documentation/REVISED-QUESTIONNAIRE-BASED-ON-PILOT-TESTING-2.pdf.
// Answer scales retain the previously documented thesis scoring; this PDF supplies wording only.
const questionnaireItems = [
  {
    indicatorId: 'response-to-name',
    indicatorLabel: 'Response to Name',
    mainQuestion: 'How often does your child respond when you call their name?',
    followUpQuestion: "What usually happens when you call your child's name? Please describe how your child responds.",
  },
  {
    indicatorId: 'eye-contact',
    indicatorLabel: 'Eye Contact',
    mainQuestion: 'How often does your child make eye contact when talking to or interacting with you?',
    followUpQuestion: 'What usually happens when your child makes eye contact with you while talking or interacting? Please describe.',
  },
  {
    indicatorId: 'joint-attention',
    indicatorLabel: 'Joint Attention',
    mainQuestion: 'When you point to something or look at something, how often does your child also look at it?',
    followUpQuestion: 'What does your child usually do when you point to or look at something? Do they look at the same object?',
  },
  {
    indicatorId: 'use-of-gestures',
    indicatorLabel: 'Use of Gestures',
    mainQuestion: 'How often does your child use gestures, such as pointing, waving, nodding, or shaking their head, to communicate?',
    followUpQuestion: 'What gestures does your child usually use to communicate? Please give an example.',
  },
  {
    indicatorId: 'social-interaction',
    indicatorLabel: 'Social Interaction',
    mainQuestion: 'How often does your child interact with other children?',
    followUpQuestion: 'How does your child usually interact with other children? Do they play with them, talk to them, or prefer to stay alone? Please describe.',
  },
  {
    indicatorId: 'sharing-interest',
    indicatorLabel: 'Sharing Interest',
    mainQuestion: 'How often does your child show you something they are interested in or excited about?',
    followUpQuestion: 'What does your child usually show you when they are interested or excited? Does your child look at you or wait for your reaction?',
  },
  {
    indicatorId: 'play-behavior',
    indicatorLabel: 'Play Behavior',
    mainQuestion: 'How often does your child engage in pretend play, such as pretending to feed a doll, cook, or drive a toy car?',
    followUpQuestion: 'What pretend activities does your child usually do? If your child does not usually engage in pretend play, what do they usually do when playing?',
  },
  {
    indicatorId: 'language-and-communication',
    indicatorLabel: 'Language and Communication',
    mainQuestion: 'Does your child usually express their needs, wants, or feelings using words, sounds, or gestures?',
    followUpQuestion: 'How does your child usually communicate what they want or need? Approximately how many words or phrases can your child currently use?',
  },
  {
    indicatorId: 'understanding-and-following-instructions',
    indicatorLabel: 'Understanding and Following Instructions',
    mainQuestion: 'Does your child usually follow simple instructions, such as \u201cCome here,\u201d \u201cGive me the toy,\u201d or \u201cSit down\u201d?',
    followUpQuestion: 'When you give your child a simple instruction, do you usually need to repeat it or use gestures before they follow it? Please give an example.',
  },
  {
    indicatorId: 'repetitive-behaviors-or-routines',
    indicatorLabel: 'Repetitive Behaviors or Routines',
    mainQuestion: 'Does your child show repetitive movements or behaviors, such as hand-flapping, spinning, rocking, or repeating the same action?',
    followUpQuestion: 'What repetitive movement or behavior does your child usually do? When does it usually happen, such as when your child is excited, upset, or stressed?',
  },
  {
    indicatorId: 'sensory-responses',
    indicatorLabel: 'Sensory Responses',
    mainQuestion: 'Does your child have a strong reaction to certain sounds, types of touch, or other sensations, such as covering their ears, crying, or avoiding them?',
    followUpQuestion: 'What usually causes the reaction, and what does your child usually do? Please give an example.',
  },
  {
    indicatorId: 'emotional-response-to-change',
    indicatorLabel: 'Emotional Response to Change',
    mainQuestion: 'Does your child become upset when there is a change in their usual routine or when they are introduced to a new situation?',
    followUpQuestion: 'What type of change usually upsets your child? For example, a change in schedule, going to a new place, or meeting a new person. How does your child usually react?',
  },
  {
    indicatorId: 'fixation-preoccupation',
    indicatorLabel: 'Fixation/Preoccupation',
    mainQuestion: 'Is there an object or activity that your child really likes and wants to do or look at repeatedly?',
    followUpQuestion: 'What object or activity is your child especially interested in? What does your child usually do with it, and do they have difficulty stopping or moving to another activity?',
  },
]

export const mockQuestions: QuestionnaireQuestion[] = questionnaireItems.map((item, index) => ({
  ...item,
  language: 'en',
  id: `q${index + 1}`,
  questionNumber: index + 1,
  options: index < 9
    ? [
        { id: 'always', label: 'Always', score: 0 },
        { id: 'sometimes', label: 'Sometimes', score: 1 },
        { id: 'never', label: 'Never', score: 2 },
      ]
    : [
        { id: 'yes', label: 'Yes', score: 2 },
        { id: 'sometimes', label: 'Sometimes', score: 1 },
        { id: 'no', label: 'No', score: 0 },
      ],
  questionnaireVersion: QUESTIONNAIRE_VERSION,
  contentStatus: 'approved',
}))


const filipinoOptionLabels: Record<string, string> = {
  always: 'Palagi', sometimes: 'Minsan', never: 'Hindi kailanman', yes: 'Oo', no: 'Hindi',
}

export function getQuestionnaireQuestions(language: AssessmentLanguage = 'en'): QuestionnaireQuestion[] {
  if (language === 'en') return mockQuestions
  if (language !== 'fil') throw new Error('Please choose English or Tagalog.')
  return mockQuestions.map((question) => {
    const translated = filipinoQuestions[question.id]
    if (!translated) throw new Error(`Missing Filipino content for ${question.id}.`)
    return {
      ...question,
      ...translated,
      language,
      options: question.options.map((option) => ({ ...option, label: filipinoOptionLabels[option.id] ?? option.label })),
    }
  })
}
