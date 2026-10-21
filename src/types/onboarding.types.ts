export type GuardianRelationship = '' | 'parent' | 'legal-guardian'
export type OnboardingStep = 'about' | 'consent' | 'parent-child' | 'complete'

export interface EligibilityDraft {
  relationship: GuardianRelationship
  regularInteraction: boolean
  ageMonths: string
}

export interface DemoConsent {
  accepted: true
  version: string
  acceptedAt: string
  scope: 'frontend-demo'
}

export interface DemoOnboarding {
  aboutAcknowledged: boolean
  consentSelected: boolean
  consent: DemoConsent | null
  eligibility: EligibilityDraft
  eligibilityConfirmed: boolean
  completedAt: string | null
}

export type EligibilityErrors = Partial<Record<keyof EligibilityDraft, string>>
