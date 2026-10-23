import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { ShieldCheck } from 'lucide-react'

export function AssessmentResult({ language = 'en' }: { language?: AssessmentLanguage }) {
  const copy = assessmentCopy[language]
  return (
    <div className="result-placeholder">
      <ShieldCheck aria-hidden="true" />
      <h3>{copy.noRiskHeading}</h3>
      <p>{copy.noRiskText}</p>
    </div>
  )
}
