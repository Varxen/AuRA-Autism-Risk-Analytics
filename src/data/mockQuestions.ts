import type { QuestionnaireQuestion } from '../types/questionnaire.types'

export const QUESTIONNAIRE_VERSION = 'reference-demo-v1'
export const QUESTION_COUNT = 13

export const mockQuestions: QuestionnaireQuestion[] = Array.from(
  { length: QUESTION_COUNT },
  (_, index) => ({
    id: `q${index + 1}`,
    questionNumber: index + 1,
    indicatorId: index === 0 ? 'eye-contact' : null,
    indicatorLabel: index === 0 ? 'Eye Contact' : null,
    mainQuestion:
      index === 0
        ? 'How often does your child respond when you call his/her name?'
        : null,
    followUpQuestion:
      index === 0
        ? "What usually happens when you call your child's name? Please describe how your child responds."
        : null,
    options:
      index < 9
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
    contentStatus: index === 0 ? 'reference-demo' : 'awaiting-approval',
  }),
)
