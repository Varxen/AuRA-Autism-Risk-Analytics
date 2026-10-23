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
        <span className="development-badge">Under development</span>
        <p>
          {document === 'Privacy Policy'
            ? 'The full privacy policy is awaiting approval, including data access, retention, withdrawal and deletion procedures.'
            : 'The terms for using the future AuRA service are awaiting approval. Opening this notice does not accept any terms.'}
        </p>
        <p>This frontend demo keeps responses in temporary memory. Refreshing or signing out clears chat and assessment sessions. Please use fictional details.</p>
        <p>The authentication backend stores account records and sessions. Approved policies and clinical risk classification are not available yet.</p>
      </dialog>
    </>
  )
}
