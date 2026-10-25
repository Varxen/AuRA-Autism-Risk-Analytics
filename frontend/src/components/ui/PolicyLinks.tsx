import { useId, useRef, useState } from 'react'
import { ShieldCheck, X } from 'lucide-react'

export function PolicyLinks() {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [document, setDocument] = useState<'Privacy Policy' | 'Terms and Conditions'>('Privacy Policy')

  function open(value: typeof document) {
    setDocument(value)
    dialog.current?.showModal()
  }

  return (
    <>
      <span className="policy-links">
        <button type="button" onClick={() => open('Privacy Policy')}>Privacy Policy</button>
        <span aria-hidden="true"> &amp; </span>
        <button type="button" onClick={() => open('Terms and Conditions')}>Terms and Conditions</button>
      </span>
      <dialog
        ref={dialog}
        className="entry-dialog policy-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <button type="button" className="icon-button entry-dialog-close" aria-label="Close policy notice" onClick={() => dialog.current?.close()}><X /></button>
        <ShieldCheck size={30} aria-hidden="true" />
        <h2 id={titleId}>{document}</h2>
        <span className="development-badge">Development draft</span>
        {document === 'Privacy Policy' ? (
          <div className="policy-sections">
            <section>
              <h3>Information stored</h3>
              <p>AuRA stores your account email and password hash, session record, consent version and time, guardian relationship, regular-interaction confirmation, and child age in months. Each information chat stores your messages, AuRA’s fixed replies, and timestamps. Each assessment stores its language and questionnaire version, selected answers, calculated item scores, original follow-up text and timestamps. Child names are not requested, but free-text messages may contain personal information.</p>
            </section>
            <section>
              <h3>Purpose and access</h3>
              <p>AuRA uses these records to sign you in, check setup eligibility, restore chats and assessments, and show your History. Records are in this project's development PostgreSQL database. Project database operators can access them.</p>
            </section>
            <section>
              <h3>Retention and deletion</h3>
              <p>No automatic deletion schedule is configured. Saved chats and assessments remain until you delete them from History. Account and onboarding records remain until a project database operator removes the account; self-service account deletion is not available. Retention for database backups has not been defined.</p>
            </section>
            <section>
              <h3>Development limits</h3>
              <p>Use fictional child information. The service does not send answers to NLP or ML, does not generate a risk classification, and does not authorize research or model training. This draft needs privacy and stakeholder review before real child data or production use.</p>
            </section>
          </div>
        ) : (
          <div className="policy-sections">
            <section>
              <h3>Research pre-assessment</h3>
              <p>AuRA is an educational pre-screening research system for parents and legal guardians of children aged 12–36 months. It is not a diagnosis, emergency service, or replacement for professional evaluation. Model categories use preliminary score-derived labels; they are not ASD probabilities or clinical risk estimates.</p>
            </section>
            <section>
              <h3>Your responsibility</h3>
              <p>Use fictional child information in this development build. Only a parent or legal guardian with regular direct interaction should complete the questionnaire. Assessment answers are stored in the project database. Follow-up text is retained but is not used as a model feature.</p>
            </section>
            <section>
              <h3>Storage and deletion</h3>
              <p>Chat messages and assessment answers are saved to the project's development database and remain until deleted from History. Account and onboarding deletion requires a project database operator. No automatic retention period or production service commitment is set.</p>
            </section>
          </div>
        )}
        <p className="policy-draft-note">This development notice is not a legally reviewed Terms and Conditions or Privacy Policy. It does not replace approved consent wording for research or production use. Opening this notice does not accept it.</p>
      </dialog>
    </>
  )
}
