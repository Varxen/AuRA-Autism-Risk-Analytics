import { useOnboarding } from "../../hooks/useOnboarding";
import { OnboardingNavigation } from "../../components/onboarding/OnboardingNavigation";

export function ConsentPage() {
  const { record, selectConsent, acceptConsent, backToAbout } =
    useOnboarding();
  return (
    <form
      aria-labelledby="consent-title"
      onSubmit={(event) => {
        event.preventDefault();
        acceptConsent();
      }}
    >
      <div className="onboarding-heading">
        <span className="entry-eyebrow">YOUR CHOICE, YOUR PACE</span>
        <h1 id="consent-title">Your privacy comes first.</h1>
        <p>Please read this demonstration notice before continuing.</p>
      </div>
      <div className="consent-copy">
        <section>
          <h2>What this preview asks for</h2>
          <p>
            Your parent/guardian relationship, regular interaction with the
            child, and age in months. The later assessment accepts behavior
            choices and written observations. Please use fictional details.
          </p>
        </section>
        <section>
          <h2>What happens to your information</h2>
          <p>
            This demo uses only temporary browser memory. It sends no details to
            a backend or database. Refreshing resets the session. Your choices
            are not stored in localStorage or sessionStorage.
          </p>
        </section>
        <section>
          <h2>Before a real service is available</h2>
          <p>
            Approved privacy wording must identify authorized access, collection
            purposes, retention, and deletion/contact arrangements. Those
            production practices are not implemented or promised by this
            preview.
          </p>
        </section>
        <section>
          <h2>Taking part is voluntary</h2>
          <p>
            You can decline or exit. This agreement does not authorize research
            use or model training. Any optional research consent would be
            requested separately.
          </p>
        </section>
      </div>
      <br />
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
