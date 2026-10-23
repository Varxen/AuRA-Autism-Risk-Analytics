import type { AssessmentLanguage, QuestionnaireQuestion } from './questionnaire.types'

export interface AssessmentAnswer {
  questionId: string
  selectedOptionId: string
  structuredScore: number
  followUpText: string
  answeredAt: string
}

export interface AssessmentSession {
  language: AssessmentLanguage
  id: string
  questionnaireVersion: string
  status: 'in-progress' | 'awaiting-content' | 'completed'
  currentQuestionIndex: number
  answers: AssessmentAnswer[]
  startedAt: string
  completedAt: string | null
  isDemoPreview?: boolean
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
  | 'completed'

export interface AssessmentProcessingStep {
  id: string
  label: string
  description: string
  durationMs: number
}

export interface AssessmentSessionRecord {
  session: AssessmentSession
  questions: QuestionnaireQuestion[]
}
