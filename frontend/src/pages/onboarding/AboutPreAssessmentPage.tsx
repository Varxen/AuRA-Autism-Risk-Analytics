import { Baby, ClipboardList, MessageCircle } from "lucide-react";
import { AnimatedAuraAsset } from "../../components/branding/AnimatedAuraAsset";
import { AuraGreetingBubble } from "../../components/branding/AuraGreetingBubble";
import { aboutGreeting } from "../../data/auraGreetings";
import { OnboardingNavigation } from "../../components/onboarding/OnboardingNavigation";
import { useOnboarding } from "../../hooks/useOnboarding";

export function AboutPreAssessmentPage() {
  const { continueAbout, exit } = useOnboarding();
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
                  Structured choices and open-ended follow-ups describe
                  observable behavior. All 13 revised questions are available
                  in English or Tagalog.
                </p>
              </div>
            </li>
            <li>
              <MessageCircle aria-hidden="true" />
              <div>
                <h2>Your words add context</h2>
                <p>
                  Future rule-based NLP and ML may support Low / Moderate / High
                  pre-screening categories. Those services are not connected in
                  this demo.
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
      <OnboardingNavigation onBack={exit} onNext={continueAbout} />
    </section>
  );
}
