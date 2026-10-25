import { useRef, useState } from 'react'
import { Baby, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useOnboarding } from '../../hooks/useOnboarding'
import { validateEligibility } from '../../utils/onboarding'
import { OnboardingNavigation } from '../../components/onboarding/OnboardingNavigation'
import type { EligibilityErrors } from '../../types/onboarding.types'

export function ParentChildInfoPage() {
  const { record, updateEligibility, submitEligibility, backToConsent, busy, error } =
    useOnboarding()
  const [errors, setErrors] = useState<EligibilityErrors>({})
  const form = useRef<HTMLFormElement>(null)
  const { eligibility } = record
  return (
    <form
      ref={form}
      className="eligibility-form"
      noValidate
      aria-labelledby="parent-child-title"
      onSubmit={(event) => {
        event.preventDefault()
        const nextErrors = validateEligibility(eligibility)
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length) {
          const key = Object.keys(nextErrors)[0]
          form.current?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus()
        } else submitEligibility()
      }}
    >
      <div className="onboarding-heading onboarding-heading--icon">
        <span className="onboarding-heading-icon" aria-hidden="true"><UsersRound /></span>
        <div>
          <h1 id="parent-child-title">A little about you and your child.</h1>
          <p>A few details to check whether this pre-assessment is right for you.</p>
        </div>
      </div>
      <div className="eligibility-fields">
        <div className="eligibility-card">
          <fieldset>
            <legend>
              <span className="eligibility-section-title"><UserRound aria-hidden="true" />Parent or guardian</span>
            </legend>
            <p className="eligibility-section-description">Tell us how you care for the child.</p>
            <div className="entry-field">
              <label htmlFor="guardian-relationship">
                Your relationship to the child
              </label>
              <select
                id="guardian-relationship"
                name="relationship"
                value={eligibility.relationship}
                onChange={(event) =>
                  updateEligibility({
                    relationship:
                      event.target.value === 'parent'
                        ? 'parent'
                        : event.target.value === 'legal-guardian'
                          ? 'legal-guardian'
                          : '',
                  })
                }
                required
                aria-invalid={Boolean(errors.relationship)}
                aria-describedby={
                  errors.relationship ? 'relationship-error' : undefined
                }
              >
                <option value="">Select relationship</option>
                <option value="parent">Parent</option>
                <option value="legal-guardian">Legal Guardian</option>
              </select>
              {errors.relationship && (
                <p className="entry-error" id="relationship-error" role="alert">
                  {errors.relationship}
                </p>
              )}
            </div>
            <label className="entry-checkbox eligibility-interaction">
              <input
                name="regularInteraction"
                type="checkbox"
                checked={eligibility.regularInteraction}
                onChange={(event) =>
                  updateEligibility({ regularInteraction: event.target.checked })
                }
                aria-invalid={Boolean(errors.regularInteraction)}
                aria-describedby={
                  errors.regularInteraction ? 'interaction-error' : undefined
                }
              />
              <span>I interact directly with the child on a regular basis.</span>
            </label>
            {errors.regularInteraction && (
              <p className="entry-error" id="interaction-error" role="alert">
                {errors.regularInteraction}
              </p>
            )}
          </fieldset>
        </div>
        <div className="eligibility-card">
          <fieldset>
            <legend>
              <span className="eligibility-section-title"><Baby aria-hidden="true" />About your child</span>
            </legend>
            <p className="eligibility-section-description">For toddlers aged 12–36 months.</p>
            <div className="entry-field">
              <label htmlFor="child-age">Child’s age in months</label>
              <div className="eligibility-age-input">
                <input
                  id="child-age"
                  name="ageMonths"
                  type="number"
                  inputMode="numeric"
                  min={12}
                  max={36}
                  step={1}
                  required
                  value={eligibility.ageMonths}
                  onChange={(event) =>
                    updateEligibility({ ageMonths: event.target.value })
                  }
                  placeholder="e.g. 24"
                  aria-invalid={Boolean(errors.ageMonths)}
                  aria-describedby={`age-help${errors.ageMonths ? ' age-error' : ''}`}
                />
                <span aria-hidden="true">months</span>
              </div>
              <p className="entry-field-help" id="age-help">
                Use a whole number from 12 to 36 months, inclusive.
              </p>
              {errors.ageMonths && (
                <p className="entry-error" id="age-error" role="alert">
                  {errors.ageMonths}
                </p>
              )}
            </div>
          </fieldset>
        </div>
      </div>
      <div className="entry-notice eligibility-notice">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <strong>Only the essentials</strong>
          <p>
            No child name, address, medical records, or diagnosis is needed. These
            these details are saved to your account and kept separate from assessment answers.
          </p>
        </div>
      </div>
      {error && <p className="entry-error" role="alert">{error}</p>}
      <OnboardingNavigation onBack={backToConsent} disabled={busy} />
    </form>
  )
}
