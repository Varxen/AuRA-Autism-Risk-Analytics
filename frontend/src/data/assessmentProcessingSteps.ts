import type { AssessmentLanguage } from '../types/questionnaire.types'
import type { AssessmentProcessingStep } from '../types/assessment.types'

// Presentation-only preview of the thesis workflow (PDF pp. 14, 51-53).
// These timers do not process responses, run models, or generate a risk prediction.
export const assessmentProcessingSteps: AssessmentProcessingStep[] = [
  {
    id: 'review',
    label: 'Reviewing your answers...',
    description: 'Checking that all 13 answers and explanations are included.',
    durationMs: 1200,
  },
  {
    id: 'normalization',
    label: 'Standardizing your responses...',
    description: 'A preview of text preparation and normalization.',
    durationMs: 1600,
  },
  {
    id: 'indicators',
    label: 'Matching behavioral indicators...',
    description: 'Considering the context and frequency of described behaviors.',
    durationMs: 1800,
  },
  {
    id: 'encoding',
    label: 'Preparing numerical features...',
    description: 'Organizing the behavioral indicators for the classification stage.',
    durationMs: 1300,
  },
  {
    id: 'classification',
    label: 'Running the classification preview...',
    description: 'Simulating the stage where three models evaluate the same input.',
    durationMs: 2200,
  },
  {
    id: 'ensemble',
    label: 'Combining model predictions...',
    description: 'A preview of the soft voting ensemble stage.',
    durationMs: 1500,
  },
  {
    id: 'summary',
    label: 'Almost there. Preparing your summary...',
    description: 'Getting your demonstration summary ready.',
    durationMs: 1200,
  },
]


const filipinoProcessingCopy: Record<string, { label: string; description: string }> = {
  review: { label: 'Sinusuri ang inyong mga sagot...', description: 'Tinitingnan kung kumpleto ang 13 sagot at paliwanag.' },
  normalization: { label: 'Inaayos ang inyong mga tugon...', description: 'Demo ng paghahanda at pagsasaayos ng teksto.' },
  indicators: { label: 'Tinutukoy ang mga palatandaan ng pag-uugali...', description: 'Isinasaalang-alang ang konteksto at dalas ng mga inilalarawang kilos.' },
  encoding: { label: 'Inihahanda ang mga numerikal na katangian...', description: 'Inaayos ang mga palatandaan para sa yugto ng klasipikasyon.' },
  classification: { label: 'Ipinapakita ang demo ng klasipikasyon...', description: 'Simulasyon kung paano sinusuri ng tatlong modelo ang parehong datos.' },
  ensemble: { label: 'Pinagsasama ang mga prediksiyon ng modelo...', description: 'Demo ng yugto ng soft voting ensemble.' },
  summary: { label: 'Malapit na. Inihahanda ang inyong buod...', description: 'Inihahanda ang buod ng demonstrasyon.' },
}

export const assessmentProcessingStepsByLanguage: Record<AssessmentLanguage, AssessmentProcessingStep[]> = {
  en: assessmentProcessingSteps,
  fil: assessmentProcessingSteps.map((step) => ({ ...step, ...filipinoProcessingCopy[step.id] })),
}
