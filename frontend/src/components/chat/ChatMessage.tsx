import type { ReactNode } from 'react'
import { CheckCheck } from 'lucide-react'
import { Avatar } from '../ui/Avatar'

export function ChatMessage({
  role = 'assistant',
  children,
  timestamp,
  filled = false,
  className = '',
}: {
  role?: 'assistant' | 'user'
  children: ReactNode
  timestamp?: string
  filled?: boolean
  className?: string
}) {
  return (
    <div className={`message message--${role} ${className}`}>
      <Avatar role={role} />
      <div className="message-body">
        <div
          className={`message-bubble ${filled ? 'message-bubble--filled' : ''}`}
        >
          {children}
        </div>
        <div className="message-meta">
          {timestamp && (
            <time dateTime={timestamp}>
              {new Date(timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          )}
          {role === 'user' && <CheckCheck aria-label="Delivered" size={19} />}
        </div>
      </div>
    </div>
  )
}
