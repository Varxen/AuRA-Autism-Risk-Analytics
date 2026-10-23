import { assessmentCopy } from '../../data/assessmentCopy'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import { ChatMessage } from '../chat/ChatMessage'

export function FollowUpQuestion({
  content,
  language = 'en',
  timestamp,
  typing = false,
}: {
  content: string
  language?: AssessmentLanguage
  timestamp?: string
  typing?: boolean
}) {
  return (
    <ChatMessage timestamp={timestamp} className="follow-up-message">
      <h2>{assessmentCopy[language].followUpHeading}</h2>
      <p>
        {content}
        {typing && <span className="chat-typing-cursor" aria-hidden="true" />}
      </p>
    </ChatMessage>
  )
}
