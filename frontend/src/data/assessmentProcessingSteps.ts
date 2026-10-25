import type { AssessmentLanguage } from '../types/questionnaire.types'
import type { AssessmentProcessingStep } from '../types/assessment.types'

export const assessmentProcessingSteps: AssessmentProcessingStep[] = [
  {
    id: 'soft-voting',
    label: 'Classifying your answers...',
    description: 'The Logistic Regression, Random Forest, and XGBoost models are running soft voting.',
  },
]

const filipinoProcessingCopy: Record<string, { label: string; description: string }> = {
  'soft-voting': { label: 'Kinaklasipika ang inyong mga sagot...', description: 'Tumatakbo ang soft voting ng Logistic Regression, Random Forest, at XGBoost.' },
}

export const assessmentProcessingStepsByLanguage: Record<AssessmentLanguage, AssessmentProcessingStep[]> = {
  en: assessmentProcessingSteps,
  fil: assessmentProcessingSteps.map((step) => ({ ...step, ...filipinoProcessingCopy[step.id] })),
}
