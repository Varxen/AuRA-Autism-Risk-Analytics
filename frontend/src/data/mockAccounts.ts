import type {
  DemoOnboarding,
  EligibilityDraft,
} from '../types/onboarding.types'

export const DEMO_CONSENT_VERSION = 'aura-chat-assessment-storage-v1'

export function emptyEligibility(): EligibilityDraft {
  return { relationship: '', regularInteraction: false, ageMonths: '' }
}

export function createMockOnboarding(): DemoOnboarding {
  return {
    consentVersionCurrent: DEMO_CONSENT_VERSION,
    aboutAcknowledged: false,
    consentSelected: false,
    consent: null,
    eligibility: emptyEligibility(),
    eligibilityConfirmed: false,
    completedAt: null,
  }
}
