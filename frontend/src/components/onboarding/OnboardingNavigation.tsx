import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '../ui/Button'

export function OnboardingNavigation({
  onBack,
  onNext,
  disabled = false,
  nextLabel = 'Continue',
}: {
  onBack: () => void
  onNext?: () => void
  disabled?: boolean
  nextLabel?: string
}) {
  return (
    <div className="onboarding-navigation">
      <button type="button" className="entry-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" />
        Back
      </button>
      <Button
        type={onNext ? 'button' : 'submit'}
        variant="primary"
        className="entry-primary"
        onClick={onNext}
        disabled={disabled}
      >
        {nextLabel}
        <ArrowRight size={17} aria-hidden="true" />
      </Button>
    </div>
  )
}
