import { ArrowUpRight, LogOut, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ContentPage } from '../components/ui/ContentPage'
import { PolicyLinks } from '../components/ui/PolicyLinks'
import { Button } from '../components/ui/Button'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { useAura } from '../contexts/AppContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getHistoryEntries } from '../utils/history'

export function SettingsPage() {
  const { state, exit, busy, error } = useAuthDemo()
  const { chat, assessment } = useAura()
  const reducedMotion = useReducedMotion()
  const entries = getHistoryEntries(chat.conversations, assessment.sessions, assessment.processing.completedSessionIds)
  const chatCount = entries.filter((entry) => entry.kind === 'chat').length
  const assessmentCount = entries.filter((entry) => entry.kind === 'assessment').length

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
        <p>Account, consent, eligibility, information chats and assessment answers are saved in the project's PostgreSQL database. Delete chats or assessments in History. No automatic deletion schedule is set; use fictional child information.</p>
        <div className="content-policy"><PolicyLinks /></div>
        <p className="content-footnote">Account and onboarding deletion are not self-service yet. This development notice is not an approved production Privacy Policy.</p>
      </section>
      <section className="content-card content-section settings-signout" aria-labelledby="signout-title">
        <div><h3 id="signout-title">Sign out</h3><p>Signing out ends your account session and clears this tab’s cached data. Saved chats and assessments remain in History.</p></div>
        <Button onClick={() => void exit()} disabled={busy}><LogOut size={17} aria-hidden="true" />Sign out</Button>
        {error && <p className="error-message" role="alert">{error}</p>}
      </section>
    </ContentPage>
  )
}
