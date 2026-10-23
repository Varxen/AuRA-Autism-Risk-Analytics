import { PolicyLinks } from "../../components/ui/PolicyLinks";
import { useOnboarding } from "../../hooks/useOnboarding";
import { OnboardingNavigation } from "../../components/onboarding/OnboardingNavigation";

export function ConsentPage() {
  const { record, selectConsent, acceptConsent, backToAbout } = useOnboarding();
  return (
    <form
      className="consent-form"
      aria-labelledby="consent-title"
      onSubmit={(event) => {
        event.preventDefault();
        acceptConsent();
      }}
    >
      <div className="onboarding-heading onboarding-heading--icon">
        <span className="onboarding-heading-icon" aria-hidden="true"><ShieldCheck /></span>
        <div>
          <h1 id="consent-title">Your privacy comes first.</h1>
          <p>Please read this demonstration notice before continuing.</p>
        </div>
      </div>
      <div className="consent-copy">
        <section>
          <h2><ClipboardList aria-hidden="true" />What this preview asks for</h2>
          <p>
            Your parent/guardian relationship, regular interaction with the
            child, and age in months. The later assessment accepts behavior
            choices and written observations. Please use fictional details.
          </p>
        </section>
        <section>
          <h2><LockKeyhole aria-hidden="true" />What happens to your information</h2>
          <p>
            Parent and child details and assessment responses stay in temporary
            browser memory. The authentication API stores your account email,
            a password hash, and a session record. Refreshing resets demo progress.
          </p>
        </section>
        <section>
          <h2><FileCheck2 aria-hidden="true" />Before a real service is available</h2>
          <p>
            Approved privacy wording must identify authorized access, collection
            purposes, retention, and deletion/contact arrangements. Those
            production practices are not implemented or promised by this
            preview.
          </p>
        </section>
        <section>
          <h2><HeartHandshake aria-hidden="true" />Taking part is voluntary</h2>
          <p>
            You can decline or exit. This agreement does not authorize research
            use or model training. Any optional research consent would be
            requested separately.
          </p>
        </section>
      </div>
      <div className="consent-policy-links"><PolicyLinks /></div>
      <label className="entry-checkbox consent-checkbox">
        <input
          type="checkbox"
          checked={record.consentSelected}
          onChange={(event) => selectConsent(event.target.checked)}
        />
        <span>
          I have read this notice and agree to continue with the frontend
          demonstration using fictional information.
        </span>
      </label>
      <OnboardingNavigation
        onBack={backToAbout}
        disabled={!record.consentSelected}
      />
    </form>
  );
}
import { ClipboardList, FileCheck2, HeartHandshake, LockKeyhole, ShieldCheck } from "lucide-react";
