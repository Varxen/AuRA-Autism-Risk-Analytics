import type { RefObject } from 'react'
import { X } from 'lucide-react'

export function AboutAuraDialog({
  dialogRef,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>
}) {
  return (
    <dialog
      className="entry-dialog"
      ref={dialogRef}
      aria-labelledby="about-aura-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <form method="dialog">
        <button
          type="submit"
          className="icon-button entry-dialog-close"
          aria-label="Close about AuRA"
        >
          <X />
        </button>
      </form>
      <span className="entry-eyebrow">AUTISM RISK ANALYTICS</span>
      <h2 id="about-aura-title">A little understanding starts here.</h2>
      <p>
        AuRA is an ASD educational support and pre-screening research system for
        parents and legal guardians of toddlers aged 12–36 months.
      </p>
      <p>
        It is not an autism diagnosis and does not replace a professional
        developmental evaluation.
      </p>
      <div className="entry-notice">
        AuRA stores consent, eligibility, chat messages, and assessment
        responses in the project database. Use fictional child details;
        follow-up text is not used by the current model. Model categories are
        based on preliminary score-derived labels and are not diagnoses.
      </div>
    </dialog>
  )
}
