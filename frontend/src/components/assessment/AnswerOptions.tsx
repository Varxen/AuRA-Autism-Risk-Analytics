import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage, QuestionOption } from '../../types/questionnaire.types'
import { Button } from '../ui/Button'

export function AnswerOptions({
  options,
  language = 'en',
  disabled,
  onSelect,
}: {
  options: QuestionOption[]
  language?: AssessmentLanguage
  disabled: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div
      className="answer-options"
      role="group"
      aria-label={assessmentCopy[language].chooseAnswer}
    >
      {options.map((option) => (
        <Button
          disabled={disabled}
          key={option.id}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
