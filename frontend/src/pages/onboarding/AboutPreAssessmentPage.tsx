import { Baby, ClipboardList, MessageCircle } from "lucide-react";
import { AnimatedAuraAsset } from "../../components/branding/AnimatedAuraAsset";
import { AuraGreetingBubble } from "../../components/branding/AuraGreetingBubble";
import { aboutGreeting } from "../../data/auraGreetings";
import { OnboardingNavigation } from "../../components/onboarding/OnboardingNavigation";
import { useOnboarding } from "../../hooks/useOnboarding";

export function AboutPreAssessmentPage() {
  const { continueAbout, exit, busy, error } = useOnboarding();
  return (
    <section aria-labelledby="about-assessment-title">
      <div className="onboarding-heading">
        <h1 id="about-assessment-title">A first step, at your own pace.</h1>
        <p>Understand what AuRA can do, and what to expect.</p>
      </div>
      <div className="about-assessment-grid">
        <div>
          <ul className="onboarding-info-list">
            <li>
              <Baby aria-hidden="true" />
              <div>
                <h2>For toddlers aged 12–36 months</h2>
                <p>
                  A pre-screening and ASD educational support tool for parents
                  and legal guardians.
                </p>
              </div>
            </li>
            <li>
              <ClipboardList aria-hidden="true" />
              <div>
                <h2>13 questions, plus your observations</h2>
                <p>
                  Choose an answer for each item. AuRA asks a follow-up only
                  when its score is 1 or 2; score 0 moves to the next question.
                  All 13 revised questions are available in English or Tagalog.
                </p>
              </div>
            </li>
            <li>
              <MessageCircle aria-hidden="true" />
              <div>
                <h2>Your words add context</h2>
                <p>
                  Future rule-based NLP and ML may support Low / Moderate / High
                  pre-screening categories. Categories and model support are
                  based on preliminary score-derived labels, not ASD risk or
                  diagnosis. The follow-up explanation is not a model feature.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <AnimatedAuraAsset className="onboarding-about-robot">
          <AuraGreetingBubble
            messages={aboutGreeting}
            randomOrder
            className="onboarding-about-bubble"
          />
        </AnimatedAuraAsset>
      </div>
      {error && <p className="entry-error" role="alert">{error}</p>}
      <OnboardingNavigation onBack={exit} onNext={continueAbout} disabled={busy} />
    </section>
  );
}
