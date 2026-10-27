import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { Download, Info, Printer, ShieldCheck } from 'lucide-react'
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
  function printResult() {
    if (!result) return
    window.print()
  }

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
      <div className="result-watermark" aria-hidden="true">
        <img src="/assets/branding/aura-avatar.png" alt="" />
        <span>AuRA</span>
      </div>
      <div className="result-heading">
        <span className="result-icon"><ShieldCheck aria-hidden="true" /></span>
        <div>
          <h3>{copy.resultHeading}</h3>
          <p className="result-subheading">{copy.resultSubtitle}</p>
        </div>
        <div className="result-actions">
          <button type="button" className="result-download-button" onClick={printResult}>
            <Download aria-hidden="true" />
            {copy.resultDownloadPdf}
          </button>
          <button type="button" className="result-print-button" onClick={printResult}>
            <Printer aria-hidden="true" />
            {copy.resultPrint}
          </button>
        </div>
      </div>
      <section className={`result-feature result-feature--${result.category.toLowerCase()}`} aria-label={copy.resultHeading}>
        <span className="result-feature-label">{copy.resultSelectedCategory}</span>
        <strong className="result-category">{result.category}</strong>
      </section>
      <section className="result-probabilities" aria-label={copy.resultSupport}>
        <div className="result-section-heading">
          <h4>{copy.resultSupport}</h4>
          <span><Info aria-hidden="true" />{copy.resultSupportCaption}</span>
        </div>
        {(['Low', 'Moderate', 'High'] as const).map((category) => {
          const support = Math.max(0, Math.min(100, result.probabilities[category] * 100))
          return (
            <div className={`result-probability result-probability--${category.toLowerCase()}`} key={category}>
              <span className="result-probability-category">{category}</span>
              <strong className="result-probability-value">{support.toFixed(1)}%</strong>
              <div className="result-bar" role="progressbar" aria-label={`${category} ${copy.resultSupport.toLowerCase()}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(support.toFixed(1))}>
                <span style={{ width: `${support}%` }} />
              </div>
            </div>
          )
        })}
      </section>
      <section className="result-indicator-influences" aria-label={copy.resultInfluenceHeading}>
        <h4>{copy.resultInfluenceHeading}</h4>
        {result.influenceMethod === 'sometimes-one-at-a-time' ? (
          <>
            {result.influentialIndicators?.length ? (
              <ul>
                {result.influentialIndicators.map((item) => {
                  const amount = Math.abs(item.supportChangePercentagePoints).toFixed(1)
                  const label = item.supportChangePercentagePoints >= 0
                    ? copy.resultInfluenceRaised(amount)
                    : copy.resultInfluenceLowered(amount)
                  return (
                    <li key={item.indicatorId}>
                      <div>
                        <strong>{item.indicatorLabel}</strong>
                        <span>{label}</span>
                      </div>
                      <p>{item.selectedAnswer}</p>
                    </li>
                  )
                })}
              </ul>
            ) : <p>{copy.resultInfluenceEmpty}</p>}
            <p className="result-influence-reference">{copy.resultInfluenceReference}</p>
          </>
        ) : <p>{copy.resultInfluenceMissing}</p>}
      </section>
      <section className="result-explanation" aria-label={copy.resultExplanationHeading}>
        <h4>{copy.resultExplanationHeading}</h4>
        <p>{result.explanation || copy.resultExplanationMissing}</p>
      </section>
      <section className="result-recommendation" aria-label={copy.resultRecommendationHeading}>
        <h4>{copy.resultRecommendationHeading}</h4>
        <p>{result.recommendation || copy.resultRecommendationMissing}</p>
      </section>
      <div className="result-limitation-box">
        <p className="result-limitation">{copy.resultLimitation}</p>
      </div>
      <footer className="result-metadata">
        <span>{copy.resultGeneratedAt}</span>
        <time dateTime={result.generatedAt}>{new Intl.DateTimeFormat(language === 'fil' ? 'fil-PH' : 'en-US', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(result.generatedAt))}</time>
        <span>{copy.resultModelLabel}</span>
        <code>{result.modelVersion}</code>
      </footer>
    </div>
  )
}
