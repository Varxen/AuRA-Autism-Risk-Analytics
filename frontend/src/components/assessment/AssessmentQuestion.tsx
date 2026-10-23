import { assessmentCopy } from '../../data/assessmentCopy'
import type { QuestionnaireQuestion } from '../../types/questionnaire.types'
import { ChatMessage } from '../chat/ChatMessage'
import { QUESTION_COUNT } from '../../data/mockQuestions'

export function AssessmentQuestion({
  question,
  timestamp,
  content = question.mainQuestion,
  typing = false,
}: {
  question: QuestionnaireQuestion
  timestamp?: string
  content?: string | null
  typing?: boolean
}) {
  return (
    <ChatMessage timestamp={timestamp} className="question-message">
      <div className="question-heading">
        <h2>
          {assessmentCopy[question.language].questionHeading(question.questionNumber, QUESTION_COUNT, question.indicatorLabel)}
        </h2>
      </div>
      <p>
        {content}
        {typing && <span className="chat-typing-cursor" aria-hidden="true" />}
      </p>
    </ChatMessage>
  )
}
