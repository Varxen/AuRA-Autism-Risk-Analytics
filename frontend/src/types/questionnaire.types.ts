export type AssessmentLanguage = 'en' | 'fil'

export interface QuestionOption {
  id: string
  label: string
  score: number
}

export interface QuestionnaireQuestion {
  language: AssessmentLanguage
  id: string
  questionNumber: number
  indicatorId: string | null
  indicatorLabel: string | null
  mainQuestion: string | null
  followUpQuestion: string | null
  options: QuestionOption[]
  questionnaireVersion: string
  contentStatus: 'approved' | 'awaiting-approval'
}
