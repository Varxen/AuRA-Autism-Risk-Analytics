import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createMockOnboarding } from '../src/data/mockAccounts.ts'
import { routes } from '../src/constants/routes.ts'
import { mockAuthService } from '../src/services/mock/mockAuthService.ts'
import {
  authDemoReducer,
  initialAuthDemoState,
  demoEntryRoute,
  demoRouteRedirect,
  validateEligibility,
  hasValidConsent,
  requiredOnboardingStep,
} from '../src/utils/onboarding.ts'
import type { AuthDemoState, DemoScenario } from '../src/types/auth.types.ts'

const timestamp = '2026-10-21T06:00:00.000Z'
function signIn(
  state: AuthDemoState = initialAuthDemoState,
  scenario: DemoScenario = 'new',
): AuthDemoState {
  return authDemoReducer(state, {
    type: 'SIGNED_IN',
    result: {
      identity: {
        id: `fixture:${scenario}`,
        email: 'parent@example.test',
        scenario,
      },
      onboarding: createMockOnboarding(scenario, timestamp),
    },
  })
}
function record(state: AuthDemoState) {
  return state.accounts[state.identity!.id]
}
function consented() {
  let state = signIn()
  state = authDemoReducer(state, { type: 'SPLASH_FINISHED' })
  state = authDemoReducer(state, { type: 'ABOUT_ACKNOWLEDGED' })
  state = authDemoReducer(state, { type: 'CONSENT_SELECTED', selected: true })
  return authDemoReducer(state, { type: 'CONSENT_ACCEPTED', timestamp })
}

test('signed-out entry immediately shows login; every protected URL is guarded', () => {
  for (const path of [
    '/',
    '/chat',
    '/assessment',
    routes.splash,
    ...Object.values(routes.onboarding),
  ])
    assert.equal(demoRouteRedirect(initialAuthDemoState, path), routes.login)
  assert.equal(demoRouteRedirect(initialAuthDemoState, routes.login), null)
  assert.equal(demoRouteRedirect(initialAuthDemoState, routes.register), null)
})

test('mandatory transitions cannot be skipped, and consent selection requires explicit submission', () => {
  let state = signIn()
  assert.equal(demoEntryRoute(state), routes.splash)
  assert.equal(
    demoRouteRedirect(state, routes.onboarding.complete),
    routes.splash,
  )
  state = authDemoReducer(state, { type: 'SPLASH_FINISHED' })
  assert.equal(demoEntryRoute(state), routes.onboarding.about)
  assert.equal(authDemoReducer(state, { type: 'COMPLETED', timestamp }), state)
  assert.equal(
    authDemoReducer(state, { type: 'CONSENT_ACCEPTED', timestamp }),
    state,
  )
  assert.equal(
    demoRouteRedirect(state, routes.onboarding['parent-child']),
    routes.onboarding.about,
  )
  state = authDemoReducer(state, { type: 'ABOUT_ACKNOWLEDGED' })
  assert.equal(record(state).consentSelected, false)
  state = authDemoReducer(state, { type: 'CONSENT_SELECTED', selected: true })
  assert.equal(hasValidConsent(record(state)), false)
  assert.equal(
    demoRouteRedirect(state, '/assessment'),
    routes.onboarding.consent,
  )
  state = authDemoReducer(state, { type: 'CONSENT_ACCEPTED', timestamp })
  assert.equal(hasValidConsent(record(state)), true)
  assert.equal(
    demoRouteRedirect(state, routes.onboarding.complete),
    routes.onboarding['parent-child'],
  )
  state = authDemoReducer(state, {
    type: 'ELIGIBILITY_CHANGED',
    values: {
      relationship: 'parent',
      regularInteraction: true,
      ageMonths: '24',
    },
  })
  assert.equal(authDemoReducer(state, { type: 'COMPLETED', timestamp }), state)
  state = authDemoReducer(state, { type: 'ELIGIBILITY_SUBMITTED' })
  assert.equal(demoRouteRedirect(state, routes.onboarding.complete), null)
  assert.equal(record(state).completedAt, null)
  assert.equal(
    demoRouteRedirect(state, '/assessment'),
    routes.onboarding.complete,
  )
  state = authDemoReducer(state, { type: 'COMPLETED', timestamp })
  assert.equal(demoEntryRoute(state), routes.home)
  assert.equal(demoRouteRedirect(state, '/assessment'), null)
})

test('eligibility validates exact whole-month boundaries, role, and regular interaction', () => {
  for (const ageMonths of ['12', '24', '36'])
    assert.deepEqual(
      validateEligibility({
        relationship: 'legal-guardian',
        regularInteraction: true,
        ageMonths,
      }),
      {},
    )
  for (const ageMonths of ['', '11', '37', '12.5', '1e1', '-12', '12 '])
    assert.ok(
      validateEligibility({
        relationship: 'parent',
        regularInteraction: true,
        ageMonths,
      }).ageMonths,
    )
  assert.ok(
    validateEligibility({
      relationship: '',
      regularInteraction: true,
      ageMonths: '24',
    }).relationship,
  )
  assert.ok(
    validateEligibility({
      relationship: 'parent',
      regularInteraction: false,
      ageMonths: '24',
    }).regularInteraction,
  )
  let state = consented()
  state = authDemoReducer(state, {
    type: 'ELIGIBILITY_CHANGED',
    values: {
      relationship: 'parent',
      regularInteraction: true,
      ageMonths: '37',
    },
  })
  assert.equal(authDemoReducer(state, { type: 'ELIGIBILITY_SUBMITTED' }), state)
  assert.equal(authDemoReducer(state, { type: 'COMPLETED', timestamp }), state)
})

test('incomplete drafts survive Back and same-tab exit/sign-in; declined consent blocks and clears eligibility', () => {
  let state = consented()
  state = authDemoReducer(state, {
    type: 'ELIGIBILITY_CHANGED',
    values: {
      relationship: 'parent',
      regularInteraction: true,
      ageMonths: '18',
    },
  })
  assert.equal(demoRouteRedirect(state, routes.onboarding.about), null)
  assert.equal(demoRouteRedirect(state, routes.onboarding.consent), null)
  state = authDemoReducer(state, { type: 'EXIT' })
  assert.equal(demoEntryRoute(state), routes.login)
  state = signIn(state)
  state = authDemoReducer(state, { type: 'SPLASH_FINISHED' })
  assert.equal(requiredOnboardingStep(record(state)), 'parent-child')
  assert.equal(record(state).eligibility.ageMonths, '18')
  state = authDemoReducer(state, { type: 'CONSENT_DECLINED' })
  assert.equal(state.identity, null)
  assert.equal(
    demoRouteRedirect(state, routes.onboarding['parent-child']),
    routes.login,
  )
  state = signIn(state)
  state = authDemoReducer(state, { type: 'SPLASH_FINISHED' })
  assert.equal(requiredOnboardingStep(record(state)), 'consent')
  assert.equal(record(state).eligibility.ageMonths, '')
})

test('returning fixture skips setup; old consent and invalid eligibility cannot rely on a completion flag', () => {
  let state = signIn(initialAuthDemoState, 'returning')
  assert.equal(state.splashPending, false)
  assert.equal(demoEntryRoute(state), routes.home)
  assert.equal(demoRouteRedirect(state, routes.onboarding.about), routes.home)
  const identity = state.identity!
  state = {
    ...state,
    accounts: {
      ...state.accounts,
      [identity.id]: {
        ...record(state),
        consent: { ...record(state).consent!, version: 'old-version' },
      },
    },
  }
  assert.equal(
    demoRouteRedirect(state, '/assessment'),
    routes.onboarding.consent,
  )
  state = signIn(initialAuthDemoState, 'returning')
  state = authDemoReducer(state, { type: 'CONSENT_SELECTED', selected: false })
  assert.equal(requiredOnboardingStep(record(state)), 'consent')
  assert.equal(record(state).completedAt, null)
})

test('mock sign-in validates email and never returns a password, token, or real session', async () => {
  await assert.rejects(() => mockAuthService.signIn('invalid', 'new'))
  const result = await mockAuthService.signIn(' Parent@Example.Test ', 'new')
  assert.equal(result.identity.email, 'parent@example.test')
  assert.deepEqual(Object.keys(result).sort(), ['identity', 'onboarding'])
  assert.equal(result.onboarding.consent, null)
})
