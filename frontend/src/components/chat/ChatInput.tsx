import { useEffect, useState } from 'react'
import { Send, Smile } from 'lucide-react'

export function ChatInput({
  onSend,
  initialValue = '',
  disabled = false,
  placeholder = 'Type your response...',
  responseLabel = 'Your response',
  sendLabel = 'Send message',
}: {
  onSend: (text: string) => Promise<boolean>
  initialValue?: string
  disabled?: boolean
  placeholder?: string
  responseLabel?: string
  sendLabel?: string
}) {
  const [text, setText] = useState(initialValue)
  const [sending, setSending] = useState(false)
  const [pointerFocused, setPointerFocused] = useState(false)
  useEffect(() => setText(initialValue), [initialValue])
  return (
    <form
      className="chat-input"
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled && !sending && text.trim()) {
          const response = text
          setSending(true)
          setText('')
          void onSend(response)
            .then((sent) => {
              if (!sent) setText((current) => current || response)
            })
            .catch(() => setText((current) => current || response))
            .finally(() => setSending(false))
        }
      }}
    >
      <Smile className="input-smile" aria-hidden="true" strokeWidth={1.2} />
      <label htmlFor="chat-response" className="sr-only">
        {responseLabel}
      </label>
      <input
        id="chat-response"
        className={pointerFocused ? 'chat-input-pointer-focused' : undefined}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onPointerDown={() => setPointerFocused(true)}
        onBlur={() => setPointerFocused(false)}
        disabled={disabled || sending}
        maxLength={4000}
        autoComplete="off"
        placeholder={placeholder}
      />
      <button
        className="send-button"
        type="submit"
        disabled={disabled || sending || !text.trim()}
        aria-label={sendLabel}
      >
        <Send aria-hidden="true" fill="currentColor" />
      </button>
    </form>
  )
}
