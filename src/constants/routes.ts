import type { OnboardingStep } from '../types/onboarding.types'

export const routes = {
  login: '/auth/login',
  register: '/auth/register',
  splash: '/onboarding/splash',
  home: '/',
  onboarding: {
    about: '/onboarding/about',
    consent: '/onboarding/consent',
    'parent-child': '/onboarding/parent-child',
    complete: '/onboarding/complete',
  } satisfies Record<OnboardingStep, string>,
} as const

export const onboardingSteps: { id: OnboardingStep; label: string }[] = [
  { id: 'about', label: 'About AuRA' },
  { id: 'consent', label: 'Your consent' },
  { id: 'parent-child', label: 'A little about you' },
  { id: 'complete', label: 'All set' },
]
