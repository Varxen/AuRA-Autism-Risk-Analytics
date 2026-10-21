import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type {
  AuthDemoAction,
  AuthDemoState,
  DemoScenario,
} from '../types/auth.types'

export const AuthDemoContext = createContext<{
  state: AuthDemoState
  dispatch: Dispatch<AuthDemoAction>
  busy: boolean
  error: string
  signIn: (email: string, scenario: DemoScenario) => Promise<string | null>
  exit: () => void
} | null>(null)

export function useAuthDemo() {
  const context = useContext(AuthDemoContext)
  if (!context)
    throw new Error('useAuthDemo must be used within AuthDemoProvider')
  return context
}
