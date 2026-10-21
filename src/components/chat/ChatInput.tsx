import { useState } from 'react'
import { Send, Smile } from 'lucide-react'

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your response...',
}: {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}) {
  const [text, setText] = useState('')
  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled && text.trim()) {
          const response = text
          setText('')
          void onSend(response)
        }
      }}
    >
      <Smile className="input-smile" aria-hidden="true" strokeWidth={1.2} />
      <label htmlFor="chat-response" className="sr-only">
        Your response
      </label>
      <input
        id="chat-response"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
        maxLength={4000}
        autoComplete="off"
        placeholder={placeholder}
      />
      <button
        className="send-button"
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
      >
        <Send aria-hidden="true" fill="currentColor" />
      </button>
    </form>
  )
}
