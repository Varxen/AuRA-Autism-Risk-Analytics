import type { ChatAction } from '../../types/chat.types'
import { Button } from '../ui/Button'

export function ChatActions({
  actions,
  onAction,
  disabled,
  stacked = false,
}: {
  actions: ChatAction[]
  onAction: (action: ChatAction) => void
  disabled: boolean
  stacked?: boolean
}) {
  return (
    <div className={`chat-actions ${stacked ? 'chat-actions--stacked' : ''}`}>
      {actions.map((action) => (
        <Button
          key={action.id}
          disabled={disabled}
          onClick={() => onAction(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  )
}
