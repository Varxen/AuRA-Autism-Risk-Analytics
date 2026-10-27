import type { AssessmentLanguage } from '../types/questionnaire.types'
import type { AssessmentProcessingStep } from '../types/assessment.types'

export const assessmentProcessingSteps: AssessmentProcessingStep[] = [
  {
    id: 'soft-voting',
    label: 'Classifying and explaining your result...',
    description: 'Soft voting selects a score-derived category. The local language model then explains the category and its support values.',
  },
]

const filipinoProcessingCopy: Record<string, { label: string; description: string }> = {
  'soft-voting': { label: 'Kinaklasipika at ipinapaliwanag ang resulta...', description: 'Pinipili ng soft voting ang kategoryang mula sa score. Pagkatapos, ipinapaliwanag ito ng lokal na language model gamit ang suporta ng mga kategorya.' },
}

export const assessmentProcessingStepsByLanguage: Record<AssessmentLanguage, AssessmentProcessingStep[]> = {
  en: assessmentProcessingSteps,
  fil: assessmentProcessingSteps.map((step) => ({ ...step, ...filipinoProcessingCopy[step.id] })),
}
