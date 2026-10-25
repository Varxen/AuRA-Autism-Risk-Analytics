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
  scope: 'chat-assessment-storage-demo'
}

export interface OnboardingApiResponse {
  aboutAcknowledged: boolean
  consentAccepted: boolean
  consentVersion: string | null
  consentScope: string | null
  consentAcceptedAt: string | null
  relationship: GuardianRelationship
  regularInteraction: boolean
  ageMonths: number | null
  eligibilityConfirmed: boolean
  completedAt: string | null
  requiredStep: OnboardingStep | null
  consentVersionCurrent: string
}

export interface DemoOnboarding {
  consentVersionCurrent: string
  aboutAcknowledged: boolean
  consentSelected: boolean
  consent: DemoConsent | null
  eligibility: EligibilityDraft
  eligibilityConfirmed: boolean
  completedAt: string | null
}

export type EligibilityErrors = Partial<Record<keyof EligibilityDraft, string>>
