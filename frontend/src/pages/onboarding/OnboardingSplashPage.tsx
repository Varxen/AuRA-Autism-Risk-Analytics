import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedAuraAsset } from '../../components/branding/AnimatedAuraAsset'
import { useAuthDemo } from '../../contexts/AuthDemoContext'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { requiredOnboardingStep } from '../../utils/onboarding'
import { routes } from '../../constants/routes'

export function OnboardingSplashPage() {
  const { state, dispatch } = useAuthDemo()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const record = state.identity && state.accounts[state.identity.id]
  useEffect(() => {
    if (!record) return
    const timeout = window.setTimeout(
      () => {
        dispatch({ type: 'SPLASH_FINISHED' })
        const step = requiredOnboardingStep(record)
        navigate(step ? routes.onboarding[step] : routes.home, {
          replace: true,
        })
      },
      reducedMotion ? 100 : 2000,
    )
    return () => window.clearTimeout(timeout)
  }, [record, dispatch, navigate, reducedMotion])
  return (
    <main
      className="entry-page onboarding-splash"
      aria-label="Welcome to your AuRA setup"
    >
      <AnimatedAuraAsset className="splash-robot" />
      <span className="entry-eyebrow">EARLY INSIGHTS. BRIGHTER FUTURES.</span>
      <h1>A little understanding starts here.</h1>
      <p>Let’s get to know each other.</p>
      <div className="splash-dots" role="status">
        <span />
        <span />
        <span />
        <span className="sr-only">Opening your setup…</span>
      </div>
    </main>
  )
}
