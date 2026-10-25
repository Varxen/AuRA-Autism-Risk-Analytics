import type { DemoOnboarding, EligibilityDraft } from './onboarding.types'

export interface DemoIdentity {
  id: string
  email: string
  emailVerified: boolean
}

export interface AuthSignInResult {
  identity: DemoIdentity
  onboarding: DemoOnboarding
}

export interface AuthSessionResponse {
  user: {
    id: string
    email: string
    role: 'parent_guardian'
    emailVerified: boolean
    createdAt: string
  }
  csrfToken: string
  expiresAt: string
  idleExpiresAt: string
}

export interface AuthDemoState {
  identity: DemoIdentity | null
  accounts: Record<string, DemoOnboarding>
  splashPending: boolean
  sessionRevision: number
}

export type AuthDemoAction =
  | { type: 'SIGNED_IN'; result: AuthSignInResult }
  | { type: 'ONBOARDING_HYDRATED'; onboarding: DemoOnboarding }
  | { type: 'EXIT' }
  | { type: 'SPLASH_FINISHED' }
  | { type: 'ABOUT_ACKNOWLEDGED' }
  | { type: 'CONSENT_SELECTED'; selected: boolean }
  | { type: 'CONSENT_ACCEPTED'; timestamp: string }
  | { type: 'ELIGIBILITY_CHANGED'; values: Partial<EligibilityDraft> }
  | { type: 'ELIGIBILITY_SUBMITTED' }
  | { type: 'COMPLETED'; timestamp: string }
