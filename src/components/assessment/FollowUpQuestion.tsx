import { ChatMessage } from '../chat/ChatMessage'

export function FollowUpQuestion({
  content,
  timestamp,
}: {
  content: string
  timestamp: string
}) {
  return (
    <ChatMessage timestamp={timestamp} className="follow-up-message">
      <h2>Follow-up Question:</h2>
      <p>{content}</p>
    </ChatMessage>
  )
}
