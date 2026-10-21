import type { QuestionOption } from '../../types/questionnaire.types'
import { Button } from '../ui/Button'

export function AnswerOptions({
  options,
  disabled,
  onSelect,
}: {
  options: QuestionOption[]
  disabled: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div
      className="answer-options"
      role="group"
      aria-label="Choose your answer"
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
