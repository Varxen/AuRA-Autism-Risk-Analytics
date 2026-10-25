import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { routes } from '../constants/routes'
import { onboardingService } from '../services/api/onboardingService'
import type { DemoOnboarding, EligibilityDraft } from '../types/onboarding.types'

export function useOnboarding() {
  const { state, dispatch, exit } = useAuthDemo()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const record = state.identity && state.accounts[state.identity.id]
  if (!record) throw new Error('Onboarding requires an active account session')

  async function persist(
    operation: () => Promise<DemoOnboarding>,
    destination?: string,
  ) {
    if (lock.current) return
    lock.current = true
    setSaving(true)
    setError('')
    try {
      const onboarding = await operation()
      dispatch({ type: 'ONBOARDING_HYDRATED', onboarding })
      if (destination) navigate(destination)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not save onboarding.')
    } finally {
      lock.current = false
      setSaving(false)
    }
  }

  return {
    record,
    busy: saving,
    error,
    continueAbout: () => persist(onboardingService.acknowledgeAbout, routes.onboarding.consent),
    selectConsent: (selected: boolean) =>
      dispatch({ type: 'CONSENT_SELECTED', selected }),
    acceptConsent: () => persist(onboardingService.acceptConsent, routes.onboarding['parent-child']),
    updateEligibility: (values: Partial<EligibilityDraft>) =>
      dispatch({ type: 'ELIGIBILITY_CHANGED', values }),
    submitEligibility: () =>
      persist(() => onboardingService.saveEligibility(record.eligibility), routes.onboarding.complete),
    complete: () => persist(onboardingService.complete, routes.home),
    backToAbout: () => navigate(routes.onboarding.about),
    backToConsent: () => navigate(routes.onboarding.consent),
    backToEligibility: () => navigate(routes.onboarding['parent-child']),
    exit,
  }
}
