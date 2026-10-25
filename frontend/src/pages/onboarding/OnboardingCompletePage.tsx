import { ArrowRight } from "lucide-react";
import { AnimatedAuraAsset } from "../../components/branding/AnimatedAuraAsset";
import { AuraGreetingBubble } from "../../components/branding/AuraGreetingBubble";
import { completionGreeting } from "../../data/auraGreetings";
import { Button } from "../../components/ui/Button";
import { useOnboarding } from "../../hooks/useOnboarding";

export function OnboardingCompletePage() {
  const { complete, backToEligibility, busy, error } = useOnboarding();
  return (
    <section className="onboarding-complete" aria-labelledby="complete-title">
      <AuraGreetingBubble
        messages={completionGreeting}
        repeat={false}
        className="completion-speech-bubble"
        headingId="complete-title"
      />
      <AnimatedAuraAsset className="complete-robot" />
      <p>
        Meet AuRA, explore information about autism,
        <br />
        and begin the pre-assessment whenever you choose.
      </p>
      <br />
      {error && <p className="entry-error" role="alert">{error}</p>}
      <Button variant="primary" className="entry-primary" onClick={complete} disabled={busy}>
        Continue to AuRA
        <ArrowRight size={18} aria-hidden="true" />
      </Button>
      <button className="entry-back" onClick={backToEligibility}>
        Back to your details
      </button>
    </section>
  );
}
