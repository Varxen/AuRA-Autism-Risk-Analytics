import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { ShieldCheck } from 'lucide-react'
import type { AssessmentResult as AssessmentResultData } from '../../types/assessment.types'

export function AssessmentResult({
  language = 'en',
  result,
  legacyPreview = false,
}: {
  language?: AssessmentLanguage
  result: AssessmentResultData | null
  legacyPreview?: boolean
}) {
  const copy = assessmentCopy[language]
  if (!result) {
    return (
      <div className="result-placeholder">
        <ShieldCheck aria-hidden="true" />
        <p>{legacyPreview ? copy.legacyPreview : copy.processingFailed}</p>
      </div>
    )
  }

  return (
    <div className="result-placeholder result-card">
      <div className="result-heading">
        <span className="result-icon"><ShieldCheck aria-hidden="true" /></span>
        <div>
          <h3>{copy.resultHeading}</h3>
          <p className="result-subheading">{copy.resultSubtitle}</p>
        </div>
      </div>
      <section className={`result-feature result-feature--${result.category.toLowerCase()}`} aria-label={copy.resultHeading}>
        <span className="result-feature-label">{copy.resultSelectedCategory}</span>
        <strong className="result-category">{result.category}</strong>
      </section>
      <section className="result-probabilities" aria-label={copy.resultSupport}>
        <div className="result-section-heading">
          <h4>{copy.resultSupport}</h4>
          <span>{copy.resultSupportCaption}</span>
        </div>
        {(['Low', 'Moderate', 'High'] as const).map((category) => {
          const support = Math.max(0, Math.min(100, result.probabilities[category] * 100))
          return (
            <div className={`result-probability result-probability--${category.toLowerCase()}`} key={category}>
              <div className="result-probability-label">
                <span>{category}</span>
                <strong>{support.toFixed(1)}%</strong>
              </div>
              <div className="result-bar" role="progressbar" aria-label={`${category} ${copy.resultSupport.toLowerCase()}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(support.toFixed(1))}>
                <span style={{ width: `${support}%` }} />
              </div>
            </div>
          )
        })}
      </section>
      <div className="result-limitation-box">
        <p className="result-limitation">{copy.resultLimitation}</p>
      </div>
      <footer className="result-metadata">
        <span>{copy.resultModelLabel}</span>
        <code>{result.modelVersion}</code>
      </footer>
    </div>
  )
}
