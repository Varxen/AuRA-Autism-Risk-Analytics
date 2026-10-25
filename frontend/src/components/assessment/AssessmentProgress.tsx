import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'

export function AssessmentProgress({
  current,
  language = 'en',
  total,
}: {
  current: number
  language?: AssessmentLanguage
  total: number
}) {
  return (
    <div className="assessment-progress">
      <label htmlFor="assessment-progress">
        <span className="assessment-progress-title">{assessmentCopy[language].progress}</span>
        <span className="assessment-progress-count">{current}/{total}</span>
        <span className="assessment-language-badge">{language === 'fil' ? 'Tagalog' : 'English'}</span>
      </label>
      <progress id="assessment-progress" value={current} max={total}>
        {current}/{total}
      </progress>
    </div>
  )
}
