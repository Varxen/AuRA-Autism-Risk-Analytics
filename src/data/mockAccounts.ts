import type { DemoScenario } from '../types/auth.types'
import type {
  DemoOnboarding,
  EligibilityDraft,
} from '../types/onboarding.types'

export const DEMO_CONSENT_VERSION = 'frontend-demo-v1'

export function emptyEligibility(): EligibilityDraft {
  return { relationship: '', regularInteraction: false, ageMonths: '' }
}

export function createMockOnboarding(
  scenario: DemoScenario,
  timestamp: string,
): DemoOnboarding {
  const returning = scenario === 'returning'
  return {
    aboutAcknowledged: returning,
    consentSelected: returning,
    consent: returning
      ? {
          accepted: true,
          version: DEMO_CONSENT_VERSION,
          acceptedAt: timestamp,
          scope: 'frontend-demo',
        }
      : null,
    eligibility: returning
      ? { relationship: 'parent', regularInteraction: true, ageMonths: '24' }
      : emptyEligibility(),
    eligibilityConfirmed: returning,
    completedAt: returning ? timestamp : null,
  }
}
