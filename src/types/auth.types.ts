import type { DemoOnboarding, EligibilityDraft } from './onboarding.types'

export type DemoScenario = 'new' | 'returning'

export interface DemoIdentity {
  id: string
  email: string
  scenario: DemoScenario
}

export interface MockSignInResult {
  identity: DemoIdentity
  onboarding: DemoOnboarding
}

export interface AuthDemoState {
  identity: DemoIdentity | null
  accounts: Record<string, DemoOnboarding>
  splashPending: boolean
  sessionRevision: number
}

export type AuthDemoAction =
  | { type: 'SIGNED_IN'; result: MockSignInResult }
  | { type: 'EXIT' }
  | { type: 'SPLASH_FINISHED' }
  | { type: 'ABOUT_ACKNOWLEDGED' }
  | { type: 'CONSENT_SELECTED'; selected: boolean }
  | { type: 'CONSENT_ACCEPTED'; timestamp: string }
  | { type: 'CONSENT_DECLINED' }
  | { type: 'ELIGIBILITY_CHANGED'; values: Partial<EligibilityDraft> }
  | { type: 'ELIGIBILITY_SUBMITTED' }
  | { type: 'COMPLETED'; timestamp: string }
