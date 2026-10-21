import { useRef } from "react";
import { X } from "lucide-react";

export function PrivacyTermsNotice() {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <p className="login-demo-note" id="demo-signin-note">
        Your privacy matters. Read our{" "}
        <button
          type="button"
          className="login-legal-link"
          aria-haspopup="dialog"
          aria-controls="aura-legal-dialog"
          onClick={() => dialog.current?.showModal()}
        >
          Privacy Notice
        </button>{" "}
        and{" "}
        <button
          type="button"
          className="login-legal-link"
          aria-haspopup="dialog"
          aria-controls="aura-legal-dialog"
          onClick={() => dialog.current?.showModal()}
        >
          Terms and Conditions
        </button>.
      </p>
      <dialog
        id="aura-legal-dialog"
        className="entry-dialog"
        ref={dialog}
        aria-labelledby="legal-notice-title"
        aria-describedby="legal-notice-description"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <button
          type="button"
          className="icon-button entry-dialog-close"
          aria-label="Close privacy and terms notice"
          onClick={() => dialog.current?.close()}
        >
          <X aria-hidden="true" />
        </button>
        <span className="entry-eyebrow">PRIVACY & TERMS</span>
        <h2 id="legal-notice-title">Under development</h2>
        <p id="legal-notice-description">
          AuRA’s Privacy Notice and Terms and Conditions are being prepared.
          Please check back later.
        </p>
      </dialog>
    </>
  );
}
