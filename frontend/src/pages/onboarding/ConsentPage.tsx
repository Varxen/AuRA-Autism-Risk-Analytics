import { ClipboardList, FileCheck2, HeartHandshake, LockKeyhole, ShieldCheck } from 'lucide-react'
import { PolicyLinks } from '../../components/ui/PolicyLinks'
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation'
import { useOnboarding } from '../../hooks/useOnboarding'

export function ConsentPage() {
  const { record, selectConsent, acceptConsent, backToAbout, busy, error } = useOnboarding()
  return (
    <form
      className="consent-form"
      aria-labelledby="consent-title"
      onSubmit={(event) => {
        event.preventDefault()
        acceptConsent()
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
            Your information-chat messages and AuRA replies are saved with your
            account. Setup also stores your guardian relationship, regular
            interaction, and child age in months. Assessments store choices and
            written observations. Please use fictional child details.
          </p>
        </section>
        <section>
          <h2><LockKeyhole aria-hidden="true" />What happens to your information</h2>
          <p>
            AuRA saves your account email, consent record, guardian relationship,
            regular interaction confirmation, child age in months, chat messages,
            and assessment language, choices, scores, original follow-up text,
            and timestamps in the project&#39;s PostgreSQL database.
          </p>
        </section>
        <section>
          <h2><FileCheck2 aria-hidden="true" />Before a real service is available</h2>
          <p>
            No automatic deletion schedule is set. You can permanently delete
            each chat or assessment in History. Account and onboarding deletion
            is not self-service yet. Database backup retention is undefined;
            project database operators can access these records.
          </p>
        </section>
        <section>
          <h2><HeartHandshake aria-hidden="true" />Taking part is voluntary</h2>
          <p>
            This consent covers the development demonstration only. It does not
            authorize research use or model training. Use fictional child
            information. Chat replies use the local knowledge content; no NLP or
            ML analysis runs on your messages.
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
          I have read this data storage notice and agree to save fictional
          demonstration chat messages and assessment answers to my AuRA account.
        </span>
      </label>
      <OnboardingNavigation
        onBack={backToAbout}
        disabled={!record.consentSelected || busy}
      />
      {error && <p className="entry-error" role="alert">{error}</p>}
    </form>
  )
}
