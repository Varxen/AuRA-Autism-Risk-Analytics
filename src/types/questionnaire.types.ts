export interface QuestionOption {
  id: string
  label: string
  score: number
}

export interface QuestionnaireQuestion {
  id: string
  questionNumber: number
  indicatorId: string | null
  indicatorLabel: string | null
  mainQuestion: string | null
  followUpQuestion: string | null
  options: QuestionOption[]
  questionnaireVersion: string
  contentStatus: 'reference-demo' | 'awaiting-approval'
}
