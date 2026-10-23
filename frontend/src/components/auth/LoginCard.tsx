import { useState } from 'react'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthDemo } from '../../contexts/AuthDemoContext'
import { routes } from '../../constants/routes'
import { Button } from '../ui/Button'
import { PolicyLinks } from '../ui/PolicyLinks'

export function LoginCard({ mode }: { mode: 'login' | 'register' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, busy, error } = useAuthDemo()
  const navigate = useNavigate()
  const registering = mode === 'register'

  return (
    <form
      className="login-card"
      onSubmit={async (event) => {
        event.preventDefault()
        const destination = await signIn(email, password, mode)
        if (destination) navigate(destination, { replace: true })
      }}
    >
      <div className="login-card-heading">
        <h2>{registering ? 'Your first step starts here' : 'Welcome to AuRA'}</h2>
        <p>{registering
          ? 'Create your parent or guardian account.'
          : 'Sign in to your parent or guardian account.'}</p>
      </div>
      <div className="entry-field">
        <label htmlFor="account-email">Email address</label>
        <div className="entry-input-icon">
          <Mail size={18} aria-hidden="true" />
          <input
            id="account-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            disabled={busy}
            placeholder="parent@example.test"
            autoComplete="email"
          />
        </div>
      </div>
      <div className="entry-field">
        <label htmlFor="account-password">Password</label>
        <div className="entry-input-icon">
          <LockKeyhole size={18} aria-hidden="true" />
          <input
            id="account-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={15}
            maxLength={128}
            disabled={busy}
            autoComplete={registering ? 'new-password' : 'current-password'}
            aria-describedby={registering ? 'password-help' : undefined}
          />
        </div>
        {registering && <p className="entry-field-help" id="password-help">Use 15–128 characters.</p>}
      </div>
      {error && <p className="entry-error" role="alert">{error}</p>}
      <Button
        type="submit"
        variant="primary"
        className="entry-primary login-submit"
        disabled={busy}
      >
        {busy ? 'Please wait…' : registering ? 'Create account' : 'Sign in'}
        {!busy && <ArrowRight size={18} aria-hidden="true" />}
      </Button>
      <div className="login-demo-note">
        Your privacy matters. Learn about our <PolicyLinks />.
        <span className="login-demo-boundary">
          For development, use a test email. Your account is stored; onboarding and screening responses reset on refresh.
        </span>
      </div>
      <div className="login-mode-switch">
        {registering ? 'Already have an account?' : 'New to AuRA?'}{' '}
        <Link to={registering ? routes.login : routes.register}>
          {registering ? 'Sign in' : 'Create an account'}
        </Link>
      </div>
    </form>
  )
}
