import { useNavigate } from 'react-router-dom'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { routes } from '../constants/routes'
import { authDemoReducer } from '../utils/onboarding'
import type { AuthDemoAction } from '../types/auth.types'
import type { EligibilityDraft } from '../types/onboarding.types'

export function useOnboarding() {
  const { state, dispatch, exit, busy, error } = useAuthDemo()
  const navigate = useNavigate()
  const record = state.identity && state.accounts[state.identity.id]
  if (!record) throw new Error('Onboarding requires an active account session')

  function advance(action: AuthDemoAction, destination: string) {
    if (authDemoReducer(state, action) === state) return
    dispatch(action)
    navigate(destination)
  }

  return {
    record,
    busy,
    error,
    continueAbout: () =>
      advance({ type: 'ABOUT_ACKNOWLEDGED' }, routes.onboarding.consent),
    selectConsent: (selected: boolean) =>
      dispatch({ type: 'CONSENT_SELECTED', selected }),
    acceptConsent: () =>
      advance(
        { type: 'CONSENT_ACCEPTED', timestamp: new Date().toISOString() },
        routes.onboarding['parent-child'],
      ),
    updateEligibility: (values: Partial<EligibilityDraft>) =>
      dispatch({ type: 'ELIGIBILITY_CHANGED', values }),
    submitEligibility: () =>
      advance({ type: 'ELIGIBILITY_SUBMITTED' }, routes.onboarding.complete),
    complete: () =>
      advance(
        { type: 'COMPLETED', timestamp: new Date().toISOString() },
        routes.home,
      ),
    backToAbout: () => navigate(routes.onboarding.about),
    backToConsent: () => navigate(routes.onboarding.consent),
    backToEligibility: () => navigate(routes.onboarding['parent-child']),
    exit,
  }
}
