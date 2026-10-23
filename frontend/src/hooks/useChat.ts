import { useRef, useState } from 'react'
import { chatService } from '../services/api/chatService'
import type { ChatAction, ChatMessage, Conversation } from '../types/chat.types'
import { useChatIntroduction } from './useChatIntroduction'

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const conversation = conversations.find((item) => item.id === activeId) ?? null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const { introduction, begin, reveal, reset, play } = useChatIntroduction()

  function saveConversation(updated: Conversation) {
    setConversations((current) => current.some((item) => item.id === updated.id)
      ? current.map((item) => item.id === updated.id ? updated : item)
      : [...current, updated])
  }

  function resume(id: string) {
    if (lock.current || !conversations.some((item) => item.id === id)) return false
    if (id !== activeId) reset()
    setActiveId(id)
    setError('')
    return true
  }

  function newConversation() {
    if (lock.current) return false
    reset()
    setActiveId(null)
    setError('')
    return true
  }

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
    saveConversation({
      ...currentConversation,
      messages: [...currentConversation.messages, input],
    })
    const replies = await chatService.respond(
      currentConversation.id,
      text,
      action?.id,
    )
    for (const reply of replies) {
      setConversations((current) => current.map((item) => item.id === currentConversation.id
        ? { ...item, messages: [...item.messages, reply] }
        : item))
      if (!await play(reply)) break
    }
  }

  async function start(initialText?: string) {
    if (lock.current || introduction.phase !== 'ready') return
    if (conversation) {
      if (initialText?.trim()) await send(initialText)
      return
    }
    lock.current = true
    setBusy(true)
    setError('')
    if (!initialText?.trim()) begin()
    try {
      const created = await chatService.createConversation()
      setActiveId(created.id)
      if (initialText?.trim()) await appendReply(created, initialText)
      else {
        saveConversation(created)
        reveal(created.messages[0])
      }
    } catch {
      reset()
      setError('AuRA could not start the conversation. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function send(text: string, action?: ChatAction) {
    if (!text.trim() || !conversation || lock.current || introduction.phase !== 'ready') return
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

  return { conversation, conversations, busy, error, start, send, introduction, resume, newConversation }
}
