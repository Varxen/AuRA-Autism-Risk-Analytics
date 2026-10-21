import { useRef, useState } from 'react'
import { chatService } from '../services/api/chatService'
import type { ChatAction, ChatMessage, Conversation } from '../types/chat.types'

export function useChat() {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function appendReply(
    currentConversation: Conversation,
    text: string,
    action?: ChatAction,
  ) {
    const input: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: currentConversation.id,
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setConversation({
      ...currentConversation,
      messages: [...currentConversation.messages, input],
    })
    const replies = await chatService.respond(
      currentConversation.id,
      text,
      action?.id,
    )
    setConversation((current) =>
      current
        ? { ...current, messages: [...current.messages, ...replies] }
        : current,
    )
  }

  async function start(initialText?: string) {
    if (lock.current) return
    if (conversation) {
      if (initialText?.trim()) await send(initialText)
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const created = await chatService.createConversation()
      if (initialText?.trim()) await appendReply(created, initialText)
      else setConversation(created)
    } catch {
      setError('AuRA could not start the conversation. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function send(text: string, action?: ChatAction) {
    if (!text.trim() || !conversation || lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await appendReply(conversation, text, action)
    } catch {
      setError('AuRA could not reply. Please try sending your message again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return { conversation, busy, error, start, send }
}
