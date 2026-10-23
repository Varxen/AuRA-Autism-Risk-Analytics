import { Check } from 'lucide-react'
import { onboardingSteps } from '../../constants/routes'
import type { OnboardingStep } from '../../types/onboarding.types'

export function OnboardingProgress({ step }: { step: OnboardingStep }) {
  const current = onboardingSteps.findIndex((item) => item.id === step)
  return (
    <nav className="onboarding-progress" aria-label="Setup progress">
      <ol>
        {onboardingSteps.map((item, index) => (
          <li
            className={index <= current ? 'is-current' : ''}
            key={item.id}
            aria-current={index === current ? 'step' : undefined}
          >
            <span className="onboarding-step-number">
              {index < current ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
