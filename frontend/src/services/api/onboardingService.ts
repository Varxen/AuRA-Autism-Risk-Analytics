import { emptyEligibility } from '../../data/mockAccounts'
import type { DemoOnboarding, EligibilityDraft, OnboardingApiResponse } from '../../types/onboarding.types'

const basePath = '/api/v1/onboarding'

async function request(path = '', init: RequestInit = {}): Promise<OnboardingApiResponse> {
  let response: Response
  try {
    response = await fetch(`${basePath}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: init.body
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
    })
  } catch {
    throw new Error('Could not connect to AuRA. Start the backend and try again.')
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : 'AuRA could not save your onboarding details.'
    throw new Error(message)
  }
  if (!body || typeof body !== 'object' || !('requiredStep' in body) || !('consentVersionCurrent' in body))
    throw new Error('AuRA returned invalid onboarding data. Please try again.')
  return body as OnboardingApiResponse
}

function toRecord(value: OnboardingApiResponse): DemoOnboarding {
  const consent = value.consentAccepted && value.consentVersion && value.consentScope && value.consentAcceptedAt
    ? {
        accepted: true as const,
        version: value.consentVersion,
        scope: value.consentScope as 'chat-assessment-storage-demo',
        acceptedAt: value.consentAcceptedAt,
      }
    : null
  return {
    consentVersionCurrent: value.consentVersionCurrent,
    aboutAcknowledged: value.aboutAcknowledged,
    consentSelected: value.consentAccepted,
    consent,
    eligibility: {
      ...emptyEligibility(),
      relationship: value.relationship,
      regularInteraction: value.regularInteraction,
      ageMonths: value.ageMonths === null ? '' : String(value.ageMonths),
    },
    eligibilityConfirmed: value.eligibilityConfirmed,
    completedAt: value.completedAt,
  }
}

export const onboardingService = {
  async load(): Promise<DemoOnboarding> {
    return toRecord(await request())
  },
  async acknowledgeAbout(): Promise<DemoOnboarding> {
    return toRecord(await request('/about', { method: 'POST' }))
  },
  async acceptConsent(): Promise<DemoOnboarding> {
    return toRecord(await request('/consent', { method: 'POST' }))
  },
  async saveEligibility(draft: EligibilityDraft): Promise<DemoOnboarding> {
    return toRecord(await request('/eligibility', {
      method: 'PUT',
      body: JSON.stringify({
        relationship: draft.relationship,
        regularInteraction: draft.regularInteraction,
        ageMonths: Number(draft.ageMonths),
      }),
    }))
  },
  async complete(): Promise<DemoOnboarding> {
    return toRecord(await request('/complete', { method: 'POST' }))
  },
}
