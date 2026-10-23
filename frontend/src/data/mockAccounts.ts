import type {
  DemoOnboarding,
  EligibilityDraft,
} from '../types/onboarding.types'

export const DEMO_CONSENT_VERSION = 'frontend-demo-v1'

export function emptyEligibility(): EligibilityDraft {
  return { relationship: '', regularInteraction: false, ageMonths: '' }
}

export function createMockOnboarding(): DemoOnboarding {
  return {
    aboutAcknowledged: false,
    consentSelected: false,
    consent: null,
    eligibility: emptyEligibility(),
    eligibilityConfirmed: false,
    completedAt: null,
  }
}
