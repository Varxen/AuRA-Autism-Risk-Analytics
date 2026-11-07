import { useEffect, useRef } from "react";
import { assessmentCopy } from "../../data/assessmentCopy";
import type { AssessmentLanguage } from "../../types/questionnaire.types";
import { Download, Info, Printer, ShieldCheck } from "lucide-react";
import type { AssessmentResult as AssessmentResultData } from "../../types/assessment.types";

// Printable area of an A4 page inside the 15mm / 17mm margins used by the print CSS.
const PX_PER_MM = 96 / 25.4;
const PRINT_HEIGHT_PX = 267 * PX_PER_MM;

// Height the card content needs when laid out at the print width divided by `zoom`.
function measureCard(card: HTMLElement, zoom: number) {
  const clone = card.cloneNode(true) as HTMLElement;
  clone.classList.add("result-fit-measure");
  clone.style.setProperty("--print-zoom", String(zoom));
  document.body.appendChild(clone);
  const height = clone.offsetHeight;
  clone.remove();
  return height;
}

// Shrink the card until it fits one page, however long the result text is.
function fitCardToPage(card: HTMLElement) {
  let zoom = 1;
  for (let i = 0; i < 8; i += 1) {
    const rendered = measureCard(card, zoom) * zoom;
    if (rendered <= PRINT_HEIGHT_PX) break;
    zoom = Math.max(0.3, zoom * (PRINT_HEIGHT_PX / rendered) * 0.98);
  }
  card.style.setProperty("--print-zoom", String(zoom));
}

export function AssessmentResult({
  language = "en",
  result,
  legacyPreview = false,
}: {
  language?: AssessmentLanguage;
  result: AssessmentResultData | null;
  legacyPreview?: boolean;
}) {
  const copy = assessmentCopy[language];
  const cardRef = useRef<HTMLDivElement>(null);
  const hasResult = result !== null;

  // Runs for the buttons and for Ctrl+P alike.
  useEffect(() => {
    if (!hasResult) return;
    const fit = () => {
      if (cardRef.current) fitCardToPage(cardRef.current);
    };
    const reset = () => cardRef.current?.style.removeProperty("--print-zoom");
    window.addEventListener("beforeprint", fit);
    window.addEventListener("afterprint", reset);
    return () => {
      window.removeEventListener("beforeprint", fit);
      window.removeEventListener("afterprint", reset);
    };
  }, [hasResult]);

  function printResult() {
    if (!result) return;
    window.print();
  }

  if (!result) {
    return (
      <div className="result-placeholder">
        <ShieldCheck aria-hidden="true" />
        <p>{legacyPreview ? copy.legacyPreview : copy.processingFailed}</p>
      </div>
    );
  }

  return (
    <div className="result-placeholder result-card" ref={cardRef}>
      <div className="result-watermark" aria-hidden="true">
        <img src="/assets/branding/aura-avatar.png" alt="" />
        <span>AuRA</span>
      </div>
      <div className="result-fit">
      <div className="result-heading">
        <span className="result-icon">
          <ShieldCheck aria-hidden="true" />
        </span>
        <div>
          <h3>{copy.resultHeading}</h3>
          <p className="result-subheading">{copy.resultSubtitle}</p>
        </div>
        <div className="result-actions">
          <button
            type="button"
            className="result-download-button"
            onClick={printResult}
          >
            <Download aria-hidden="true" />
            {copy.resultDownloadPdf}
          </button>
          <button
            type="button"
            className="result-print-button"
            onClick={printResult}
          >
            <Printer aria-hidden="true" />
            {copy.resultPrint}
          </button>
        </div>
      </div>
      <section
        className={`result-feature result-feature--${result.category.toLowerCase()}`}
        aria-label={copy.resultHeading}
      >
        <span className="result-feature-label">
          {copy.resultSelectedCategory}
        </span>
        <strong className="result-category">{result.category}</strong>
      </section>
      <section className="result-probabilities" aria-label={copy.resultSupport}>
        <div className="result-section-heading">
          <h4>{copy.resultSupport}</h4>
          <span>
            <Info aria-hidden="true" />
            {copy.resultSupportCaption}
          </span>
        </div>
        {(["Low", "Moderate", "High"] as const).map((category) => {
          const support = Math.max(
            0,
            Math.min(100, result.probabilities[category] * 100),
          );
          return (
            <div
              className={`result-probability result-probability--${category.toLowerCase()}`}
              key={category}
            >
              <span className="result-probability-category">{category}</span>
              <strong className="result-probability-value">
                {support.toFixed(1)}%
              </strong>
              <div
                className="result-bar"
                role="progressbar"
                aria-label={`${category} ${copy.resultSupport.toLowerCase()}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Number(support.toFixed(1))}
              >
                <span style={{ width: `${support}%` }} />
              </div>
            </div>
          );
        })}
        <p className="result-breakdown-note">
          {copy.resultBreakdownExplanation}
        </p>
      </section>
      <section
        className="result-indicator-influences"
        aria-label={copy.resultInfluenceHeading}
      >
        <h4>{copy.resultInfluenceHeading}</h4>
        {result.indicatorResponses?.length ? (
          <ul>
            {result.indicatorResponses.map((item) => (
              <li key={item.indicatorId}>
                <div>
                  <strong>{item.indicatorLabel}</strong>
                  <span>{item.selectedAnswer}</span>
                </div>
                <p className="result-indicator-followup">
                  <em>{copy.resultParentResponse}:</em>{" "}
                  {item.followUpAnswer.trim() || copy.resultNoFollowUp}
                </p>
              </li>
            ))}
          </ul>
        ) : result.influenceMethod === "sometimes-one-at-a-time" ? (
          <>
            {result.influentialIndicators?.length ? (
              <ul>
                {result.influentialIndicators.map((item) => (
                  <li key={item.indicatorId}>
                    <div>
                      <strong>{item.indicatorLabel}</strong>
                    </div>
                    <p>{item.selectedAnswer}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>{copy.resultInfluenceEmpty}</p>
            )}
          </>
        ) : (
          <p>{copy.resultInfluenceMissing}</p>
        )}
      </section>
      <section
        className="result-explanation"
        aria-label={copy.resultExplanationHeading}
      >
        <h4>{copy.resultExplanationHeading}</h4>
        <p>{result.explanation || copy.resultExplanationMissing}</p>
      </section>
      <section
        className="result-recommendation"
        aria-label={copy.resultRecommendationHeading}
      >
        <h4>{copy.resultRecommendationHeading}</h4>
        <p>
          {result.recommendation ||
            (result.category === "Low"
              ? copy.resultRecommendationLow
              : copy.resultRecommendationOther)}
        </p>
      </section>
      <div className="result-limitation-box">
        <p className="result-limitation">{copy.resultLimitation}</p>
      </div>
      <footer className="result-metadata">
        <span>{copy.resultGeneratedAt}</span>
        <time dateTime={result.generatedAt}>
          {new Intl.DateTimeFormat(language === "fil" ? "fil-PH" : "en-US", {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date(result.generatedAt))}
        </time>
        <span>{copy.resultModelLabel}</span>
        <code>{result.modelVersion}</code>
      </footer>
      </div>
    </div>
  );
}
