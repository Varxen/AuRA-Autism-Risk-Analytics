export interface AssessmentAnswer {
  questionId: string
  selectedOptionId: string
  structuredScore: number
  followUpText: string
  answeredAt: string
}

export interface AssessmentSession {
  id: string
  questionnaireVersion: string
  status: 'in-progress' | 'awaiting-content' | 'completed'
  currentQuestionIndex: number
  answers: AssessmentAnswer[]
  startedAt: string
  completedAt: string | null
}

export interface AssessmentResult {
  assessmentId: string
  riskLevel: 'unavailable'
  modelVersion: null
  probabilities?: Record<string, number>
  generatedAt: string
}

export type AssessmentStage =
  | 'question'
  | 'follow-up'
  | 'ready-next'
  | 'awaiting-content'
