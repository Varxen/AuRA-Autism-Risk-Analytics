import { useRef, useState, type FormEvent } from 'react'
import { ArrowUpRight, LogOut, ShieldCheck, Trash2, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ContentPage } from '../components/ui/ContentPage'
import { PolicyLinks } from '../components/ui/PolicyLinks'
import { Button } from '../components/ui/Button'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { useAura } from '../contexts/AppContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getHistoryEntries } from '../utils/history'
import { routes } from '../constants/routes'

export function SettingsPage() {
  const { state, exit, deleteAccount, busy, error, accountDeleteError } = useAuthDemo()
  const { chat, assessment } = useAura()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const deleteDialog = useRef<HTMLDialogElement>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteAttempted, setDeleteAttempted] = useState(false)
  const entries = getHistoryEntries(chat.conversations, assessment.sessions, assessment.processing.completedSessionIds)
  const chatCount = entries.filter((entry) => entry.kind === 'chat').length
  const assessmentCount = entries.filter((entry) => entry.kind === 'assessment').length

  async function confirmAccountDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDeleteAttempted(true)
    const deleted = await deleteAccount(deletePassword)
    setDeletePassword('')
    if (deleted) {
      deleteDialog.current?.close()
      navigate(routes.login, { replace: true })
    }
  }

  return (
    <ContentPage eyebrow="Your AuRA experience" title="Settings" description="See your account and current session information.">
      <section className="content-card" id="account-settings" aria-labelledby="session-settings-title">
        <h3 id="session-settings-title">Current account</h3>
        <dl className="settings-details">
          <div><dt>Email</dt><dd>{state.identity?.email}</dd></div>
          <div><dt>Email verification</dt><dd>{state.identity?.emailVerified ? 'Verified' : 'Not available yet'}</dd></div>
          <div><dt>Session history</dt><dd>{chatCount} information {chatCount === 1 ? 'chat' : 'chats'} · {assessmentCount} {assessmentCount === 1 ? 'assessment' : 'assessments'}</dd></div>
          <div><dt>Chat &amp; assessment storage</dt><dd>Saved to AuRA development PostgreSQL</dd></div>
        </dl>
        <Link to="/history" className="content-link">Open session history <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </section>
      <section className="content-card content-section" id="profile-settings" aria-labelledby="profile-settings-title">
        <h3 id="profile-settings-title">Profile settings</h3>
        <p>Profile details and profile editing are under development. Your account currently uses your email address.</p>
      </section>
      <div className="content-grid content-section">
        <section className="content-card" aria-labelledby="language-settings-title">
          <h3 id="language-settings-title">Assessment language</h3>
          <p>Choose English or Tagalog before each new assessment. Existing sessions keep their selected language.</p>
          <Link to="/assessment" className="content-link">Open assessments <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </section>
        <section className="content-card" aria-labelledby="motion-settings-title">
          <h3 id="motion-settings-title">Motion &amp; accessibility</h3>
          <p>AuRA follows your device's reduced-motion preference. Change that preference in your device settings.</p>
          <span className="content-tag">Reduced motion: {reducedMotion ? 'on' : 'off'}</span>
        </section>
      </div>
      <section className="content-card content-section" aria-labelledby="privacy-settings-title">
        <ShieldCheck className="content-card-icon" size={25} aria-hidden="true" />
        <h3 id="privacy-settings-title">Privacy &amp; your data</h3>
        <p>Account-linked data is kept while your account is active. Delete your account to erase its onboarding, chats, assessments, answers and results. Use fictional child information.</p>
        <div className="content-policy"><PolicyLinks /></div>
        <p className="content-footnote">Database backups do not yet have a deletion schedule. This development notice is not an approved production Privacy Policy.</p>
      </section>
      <section className="content-card content-section settings-delete-account" aria-labelledby="delete-account-title">
        <h3 id="delete-account-title">Delete account</h3>
        <p>Permanently delete your account and all application data linked to it, including onboarding, chats, assessments and results. This cannot be undone.</p>
        <Button
          className="button--danger"
          onClick={() => {
            setDeleteAttempted(false)
            setDeletePassword('')
            deleteDialog.current?.showModal()
          }}
          disabled={busy}
        >
          <Trash2 size={17} aria-hidden="true" />Delete account
        </Button>
        <dialog
          ref={deleteDialog}
          className="entry-dialog account-delete-dialog"
          aria-labelledby="account-delete-dialog-title"
          onClose={() => {
            setDeletePassword('')
            setDeleteAttempted(false)
          }}
        >
          <button type="button" className="icon-button entry-dialog-close" aria-label="Close" onClick={() => deleteDialog.current?.close()}>
            <X aria-hidden="true" />
          </button>
          <form onSubmit={(event) => void confirmAccountDeletion(event)}>
            <h2 id="account-delete-dialog-title">Confirm account deletion</h2>
            <p>This permanently erases all account-linked application data. Enter your password to confirm.</p>
            <label htmlFor="account-delete-password">Account password</label>
            <input
              id="account-delete-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              maxLength={128}
              required
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              disabled={busy}
            />
            {deleteAttempted && accountDeleteError && <p className="error-message" role="alert">{accountDeleteError}</p>}
            <div className="account-delete-actions">
              <Button onClick={() => deleteDialog.current?.close()} disabled={busy}>Cancel</Button>
              <Button type="submit" className="button--danger" disabled={busy || !deletePassword}>
                {busy ? 'Deleting…' : 'Permanently delete'}
              </Button>
            </div>
          </form>
        </dialog>
      </section>
      <section className="content-card content-section settings-signout" aria-labelledby="signout-title">
        <div><h3 id="signout-title">Sign out</h3><p>Signing out ends your account session and clears this tab’s cached data. Saved chats and assessments remain in History.</p></div>
        <Button onClick={() => void exit()} disabled={busy}><LogOut size={17} aria-hidden="true" />Sign out</Button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
    </ContentPage>
  )
}
