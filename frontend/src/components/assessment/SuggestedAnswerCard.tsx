import { Check, CircleCheck, Pencil } from 'lucide-react'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { assessmentCopy } from '../../data/assessmentCopy'

export function SuggestedAnswerCard({
  answer,
  language,
  disabled,
  onApprove,
  onKeepCurrent,
}: {
  answer: string
  language: AssessmentLanguage
  disabled: boolean
  onApprove: () => void
  onKeepCurrent: () => void
}) {
  const copy = assessmentCopy[language]

  return (
    <div className="suggested-answer-card">
      <div className="suggested-answer-content">
        <h3>{copy.suggestedAnswerHeading}</h3>
        <p className="suggested-answer-description">
          {copy.suggestedAnswerDescription}{' '}
          <span className="suggested-answer-value">{answer}</span>
        </p>
        <div className="suggested-answer-actions">
          <button className="suggested-answer-action suggested-answer-action--approve" disabled={disabled} onClick={onApprove}>
            <CircleCheck aria-hidden="true" />
            <span>
              <strong>{copy.useSuggestedAnswer(answer)}</strong>
              <small>{copy.approveAndContinue}</small>
            </span>
          </button>
          <button className="suggested-answer-action suggested-answer-action--keep" disabled={disabled} onClick={onKeepCurrent}>
            <Pencil aria-hidden="true" />
            <span>
              <strong>{copy.keepCurrentAnswer}</strong>
              <small>{copy.goBackAndReview}</small>
            </span>
          </button>
        </div>
      </div>
      <div className="suggested-answer-art" aria-hidden="true">
        <div className="suggested-answer-checklist">
          <span><Check /></span><i />
          <span><Check /></span><i />
          <span><Check /></span><i />
        </div>
      </div>
    </div>
  )
}
