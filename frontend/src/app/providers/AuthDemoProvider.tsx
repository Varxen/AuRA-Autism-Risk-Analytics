import { useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthDemoContext } from '../../contexts/AuthDemoContext'
import { authService } from '../../services/api/authService'
import { onboardingService } from '../../services/api/onboardingService'
import type { AuthSessionResponse } from '../../types/auth.types'
import type { DemoOnboarding } from '../../types/onboarding.types'
import { AuraMascot } from '../../components/branding/AuraMascot'
import {
  authDemoReducer,
  demoEntryRoute,
  initialAuthDemoState,
} from '../../utils/onboarding'

function signInAction(session: AuthSessionResponse, onboarding: DemoOnboarding) {
  return {
    type: 'SIGNED_IN' as const,
    result: {
      identity: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      },
      onboarding,
    },
  }
}

export function AuthDemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authDemoReducer, initialAuthDemoState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [accountDeleteError, setAccountDeleteError] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restoring, setRestoring] = useState(true)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const csrfToken = useRef<string | null>(null)
  const lock = useRef(false)

  useEffect(() => {
    let cancelled = false
    authService.restore().then(async (session) => {
      if (cancelled || !session) return
      const onboarding = await onboardingService.load()
      if (cancelled) return
      csrfToken.current = session.csrfToken
      dispatch(signInAction(session, onboarding))
    }).catch((cause: unknown) => {
      if (cancelled) return
      setRestoreError(cause instanceof Error ? cause.message : 'Could not restore your account session.')
    }).finally(() => {
      if (!cancelled) setRestoring(false)
    })
    return () => { cancelled = true }
  }, [restoreAttempt])

  async function signIn(
    email: string,
    password: string,
    mode: 'login' | 'register',
  ): Promise<string | null> {
    if (lock.current) return null
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const session = await authService.signIn(mode, email, password)
      const onboarding = await onboardingService.load()
      csrfToken.current = session.csrfToken
      const action = signInAction(session, onboarding)
      const next = authDemoReducer(state, action)
      dispatch(action)
      return demoEntryRoute(next)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not sign you in.')
      return null
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function exit(): Promise<boolean> {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await authService.signOut(csrfToken.current ?? '')
      csrfToken.current = null
      dispatch({ type: 'EXIT' })
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not sign you out.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function deleteAccount(password: string): Promise<boolean> {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setAccountDeleteError('')
    try {
      await authService.deleteAccount(password, csrfToken.current ?? '')
      csrfToken.current = null
      dispatch({ type: 'EXIT' })
      return true
    } catch (cause) {
      setAccountDeleteError(cause instanceof Error ? cause.message : 'AuRA could not delete this account.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  if (restoring) {
    return (
      <main className="auth-session-state" role="status" aria-live="polite">
        <section className="auth-session-card">
          <div className="auth-session-robot-wrap">
            <AuraMascot variant="animated-head" decorative className="auth-session-robot" />
            <span className="auth-session-spinner" aria-hidden="true" />
          </div>
          <p className="auth-session-eyebrow">YOUR AuRA SPACE</p>
          <h1>AuRA</h1>
          <p className="auth-session-message">Checking your session<span className="auth-session-ellipsis" aria-hidden="true">…</span></p>
          <p className="auth-session-caption">Getting things ready for you</p>
          <div className="auth-session-progress" aria-hidden="true"><span /><span /><span /></div>
        </section>
      </main>
    )
  }

  if (restoreError) {
    return (
      <main className="auth-session-state">
        <section className="auth-session-card auth-session-card--error">
          <div className="auth-session-robot-wrap">
            <AuraMascot variant="animated-head" decorative className="auth-session-robot" />
          </div>
          <p className="auth-session-eyebrow">YOUR AuRA SPACE</p>
          <h1>AuRA</h1>
          <p className="auth-session-message" role="alert">{restoreError}</p>
          <button type="button" onClick={() => {
            setRestoreError('')
            setRestoring(true)
            setRestoreAttempt((current) => current + 1)
          }}>Try again</button>
        </section>
      </main>
    )
  }

  return (
    <AuthDemoContext.Provider value={{ state, dispatch, busy, error, accountDeleteError, signIn, exit, deleteAccount }}>
      {children}
    </AuthDemoContext.Provider>
  )
}
