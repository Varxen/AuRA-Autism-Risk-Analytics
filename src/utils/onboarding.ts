import { routes } from '../constants/routes.ts'
import { DEMO_CONSENT_VERSION, emptyEligibility } from '../data/mockAccounts.ts'
import type { AuthDemoAction, AuthDemoState } from '../types/auth.types'
import type {
  DemoOnboarding,
  EligibilityDraft,
  EligibilityErrors,
  OnboardingStep,
} from '../types/onboarding.types'

export const initialAuthDemoState: AuthDemoState = {
  identity: null,
  accounts: {},
  splashPending: false,
  sessionRevision: 0,
}

export function validateEligibility(
  draft: EligibilityDraft,
): EligibilityErrors {
  const errors: EligibilityErrors = {}
  if (!['parent', 'legal-guardian'].includes(draft.relationship))
    errors.relationship = 'Please select Parent or Legal Guardian.'
  if (!draft.regularInteraction)
    errors.regularInteraction =
      'Regular, direct interaction with the child is required.'
  const age = Number(draft.ageMonths)
  if (
    !/^\d+$/.test(draft.ageMonths) ||
    !Number.isInteger(age) ||
    age < 12 ||
    age > 36
  )
    errors.ageMonths = 'Enter a whole-number age from 12 to 36 months.'
  return errors
}

export function hasValidConsent(record: DemoOnboarding): boolean {
  return (
    record.consentSelected &&
    record.consent?.accepted === true &&
    record.consent.version === DEMO_CONSENT_VERSION &&
    record.consent.scope === 'frontend-demo' &&
    Number.isFinite(Date.parse(record.consent.acceptedAt))
  )
}

export function isEligible(record: DemoOnboarding): boolean {
  return Object.keys(validateEligibility(record.eligibility)).length === 0
}

export function canCompleteOnboarding(record: DemoOnboarding): boolean {
  return (
    record.aboutAcknowledged &&
    hasValidConsent(record) &&
    record.eligibilityConfirmed &&
    isEligible(record)
  )
}

export function requiredOnboardingStep(
  record: DemoOnboarding,
): OnboardingStep | null {
  if (!record.aboutAcknowledged) return 'about'
  if (!hasValidConsent(record)) return 'consent'
  if (!record.eligibilityConfirmed || !isEligible(record)) return 'parent-child'
  if (!record.completedAt || !Number.isFinite(Date.parse(record.completedAt)))
    return 'complete'
  return null
}

export function canVisitOnboardingStep(
  record: DemoOnboarding,
  step: OnboardingStep,
): boolean {
  if (step === 'about') return true
  if (step === 'consent') return record.aboutAcknowledged
  if (step === 'parent-child')
    return record.aboutAcknowledged && hasValidConsent(record)
  return canCompleteOnboarding(record)
}

export function demoEntryRoute(state: AuthDemoState): string {
  const record = state.identity && state.accounts[state.identity.id]
  if (!record) return routes.login
  const step = requiredOnboardingStep(record)
  if (!step) return routes.home
  return state.splashPending ? routes.splash : routes.onboarding[step]
}

// All URL access decisions live here. UI pages cannot bypass required state.
export function demoRouteRedirect(
  state: AuthDemoState,
  pathname: string,
): string | null {
  const authPage = pathname === routes.login || pathname === routes.register
  const record = state.identity && state.accounts[state.identity.id]
  if (!record) return authPage ? null : routes.login
  if (authPage) return demoEntryRoute(state)
  const required = requiredOnboardingStep(record)
  if (!pathname.startsWith('/onboarding/'))
    return required ? demoEntryRoute(state) : null
  if (!required) return routes.home
  if (state.splashPending)
    return pathname === routes.splash ? null : routes.splash
  if (pathname === routes.splash) return routes.onboarding[required]
  const requested = (Object.keys(routes.onboarding) as OnboardingStep[]).find(
    (step) => routes.onboarding[step] === pathname,
  )
  return requested && canVisitOnboardingStep(record, requested)
    ? null
    : routes.onboarding[required]
}

function updateRecord(
  state: AuthDemoState,
  record: DemoOnboarding,
): AuthDemoState {
  if (!state.identity) return state
  return {
    ...state,
    accounts: { ...state.accounts, [state.identity.id]: record },
  }
}

export function authDemoReducer(
  state: AuthDemoState,
  action: AuthDemoAction,
): AuthDemoState {
  if (action.type === 'SIGNED_IN') {
    const { identity, onboarding } = action.result
    const record = state.accounts[identity.id] ?? onboarding
    return {
      identity,
      accounts: { ...state.accounts, [identity.id]: record },
      splashPending: requiredOnboardingStep(record) !== null,
      sessionRevision: state.sessionRevision + 1,
    }
  }
  if (action.type === 'EXIT')
    return {
      ...state,
      identity: null,
      splashPending: false,
      sessionRevision: state.sessionRevision + 1,
    }
  const record = state.identity && state.accounts[state.identity.id]
  if (!record) return state
  switch (action.type) {
    case 'SPLASH_FINISHED':
      return { ...state, splashPending: false }
    case 'ABOUT_ACKNOWLEDGED':
      return updateRecord(state, { ...record, aboutAcknowledged: true })
    case 'CONSENT_SELECTED':
      if (!record.aboutAcknowledged) return state
      return updateRecord(state, {
        ...record,
        consentSelected: action.selected,
        ...(action.selected
          ? {}
          : { consent: null, eligibilityConfirmed: false, completedAt: null }),
      })
    case 'CONSENT_ACCEPTED':
      if (!record.aboutAcknowledged || !record.consentSelected) return state
      return updateRecord(state, {
        ...record,
        consent: {
          accepted: true,
          acceptedAt: action.timestamp,
          version: DEMO_CONSENT_VERSION,
          scope: 'frontend-demo',
        },
      })
    case 'CONSENT_DECLINED': {
      const next = updateRecord(state, {
        ...record,
        consent: null,
        consentSelected: false,
        eligibility: emptyEligibility(),
        eligibilityConfirmed: false,
        completedAt: null,
      })
      return {
        ...next,
        identity: null,
        splashPending: false,
        sessionRevision: state.sessionRevision + 1,
      }
    }
    case 'ELIGIBILITY_CHANGED':
      if (!record.aboutAcknowledged || !hasValidConsent(record)) return state
      return updateRecord(state, {
        ...record,
        eligibility: { ...record.eligibility, ...action.values },
        eligibilityConfirmed: false,
        completedAt: null,
      })
    case 'ELIGIBILITY_SUBMITTED':
      if (
        !record.aboutAcknowledged ||
        !hasValidConsent(record) ||
        !isEligible(record)
      )
        return state
      return updateRecord(state, { ...record, eligibilityConfirmed: true })
    case 'COMPLETED':
      if (!canCompleteOnboarding(record)) return state
      return updateRecord(state, { ...record, completedAt: action.timestamp })
  }
}
