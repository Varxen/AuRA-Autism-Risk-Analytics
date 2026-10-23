import { useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthDemoContext } from '../../contexts/AuthDemoContext'
import { createMockOnboarding } from '../../data/mockAccounts'
import { authService } from '../../services/api/authService'
import type { AuthSessionResponse } from '../../types/auth.types'
import {
  authDemoReducer,
  demoEntryRoute,
  initialAuthDemoState,
} from '../../utils/onboarding'

function signInAction(session: AuthSessionResponse) {
  return {
    type: 'SIGNED_IN' as const,
    result: {
      identity: {
        id: session.user.id,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
      },
      onboarding: createMockOnboarding(),
    },
  }
}

export function AuthDemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authDemoReducer, initialAuthDemoState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [restoreError, setRestoreError] = useState('')
  const [restoring, setRestoring] = useState(true)
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const csrfToken = useRef<string | null>(null)
  const lock = useRef(false)

  useEffect(() => {
    let cancelled = false
    authService.restore().then((session) => {
      if (cancelled || !session) return
      csrfToken.current = session.csrfToken
      dispatch(signInAction(session))
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
      csrfToken.current = session.csrfToken
      const action = signInAction(session)
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

  if (restoring) {
    return (
      <main className="auth-session-state" role="status">
        <h1>AuRA</h1>
        <p>Checking your session…</p>
      </main>
    )
  }

  if (restoreError) {
    return (
      <main className="auth-session-state">
        <h1>AuRA</h1>
        <p role="alert">{restoreError}</p>
        <button type="button" onClick={() => {
          setRestoreError('')
          setRestoring(true)
          setRestoreAttempt((current) => current + 1)
        }}>Try again</button>
      </main>
    )
  }

  return (
    <AuthDemoContext.Provider value={{ state, dispatch, busy, error, signIn, exit }}>
      {children}
    </AuthDemoContext.Provider>
  )
}
