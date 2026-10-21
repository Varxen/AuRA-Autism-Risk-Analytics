import { useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthDemoContext } from '../../contexts/AuthDemoContext'
import { mockAuthService } from '../../services/mock/mockAuthService'
import {
  authDemoReducer,
  demoEntryRoute,
  initialAuthDemoState,
} from '../../utils/onboarding'
import type { DemoScenario } from '../../types/auth.types'

export function AuthDemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authDemoReducer, initialAuthDemoState)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function signIn(
    email: string,
    scenario: DemoScenario,
  ): Promise<string | null> {
    if (lock.current) return null
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const result = await mockAuthService.signIn(email, scenario)
      const action = { type: 'SIGNED_IN' as const, result }
      const next = authDemoReducer(state, action)
      dispatch(action)
      return demoEntryRoute(next)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'The demo could not start. Please try again.',
      )
      return null
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  function exit() {
    if (lock.current) return
    dispatch({ type: 'EXIT' })
    setError('')
  }

  return (
    <AuthDemoContext.Provider
      value={{ state, dispatch, busy, error, signIn, exit }}
    >
      {children}
    </AuthDemoContext.Provider>
  )
}
