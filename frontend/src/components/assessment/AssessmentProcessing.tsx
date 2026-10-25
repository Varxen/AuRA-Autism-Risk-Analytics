import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { LoaderCircle } from 'lucide-react'
import type { AssessmentProcessingStep } from '../../types/assessment.types'
import { ChatMessage } from '../chat/ChatMessage'

export function AssessmentProcessing({ step, language = 'en' }: {
  step: AssessmentProcessingStep
  language?: AssessmentLanguage
}) {
  const copy = assessmentCopy[language]
  return (
    <ChatMessage className="assessment-processing">
      <div className="processing-heading">
        <span className="processing-eyebrow">{copy.processingHeading}</span>
      </div>
      <div className="processing-status" role="status" aria-live="polite" aria-atomic="true">
        <LoaderCircle className="processing-spinner" size={24} aria-hidden="true" />
        <div className="processing-copy" key={step.id}>
          <h2>{step.label}</h2>
          <p>{step.description}</p>
        </div>
      </div>
      <div className="processing-footer">
        <span>{copy.processingNotice}</span>
      </div>
    </ChatMessage>
  )
}
