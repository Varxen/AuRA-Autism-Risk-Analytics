import type { QuestionnaireQuestion } from '../../types/questionnaire.types'
import { ChatMessage } from '../chat/ChatMessage'

export function AssessmentQuestion({
  question,
  timestamp,
}: {
  question: QuestionnaireQuestion
  timestamp: string
}) {
  return (
    <ChatMessage timestamp={timestamp} className="question-message">
      <div className="question-heading">
        <h2>
          Question {question.questionNumber} of 13: {question.indicatorLabel}
        </h2>
        <span className="indicator-badge">{question.indicatorLabel}</span>
      </div>
      <p>{question.mainQuestion}</p>
    </ChatMessage>
  )
}
