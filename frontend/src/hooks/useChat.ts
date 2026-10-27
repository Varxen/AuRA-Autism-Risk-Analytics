import { useEffect, useRef, useState } from 'react'
import { chatService } from '../services/api/chatService'
import type { ChatAction, ChatMessage, Conversation } from '../types/chat.types'
import type { SessionMetadataUpdate } from '../types/history.types'
import { useChatIntroduction } from './useChatIntroduction'

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const conversation = conversations.find((item) => item.id === activeId) ?? null
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const { introduction, begin, reveal, reset, play } = useChatIntroduction()

  useEffect(() => {
    let cancelled = false
    chatService.listConversations().then((saved) => {
      if (!cancelled) setConversations(saved)
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'AuRA could not load chat history.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

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
    const turn = await chatService.respond(
      currentConversation.id,
      text,
      input.id,
      action?.id,
    )
    setConversations((current) => current.map((item) => item.id === currentConversation.id
      ? { ...item, messages: item.messages.map((message) => message.id === input.id ? turn.userMessage : message) }
      : item))
    for (const reply of turn.assistantMessages) {
      setConversations((current) => current.map((item) => item.id === currentConversation.id
        ? { ...item, messages: [...item.messages, reply] }
        : item))
      if (!await play(reply)) break
    }
  }

  async function start(initialText?: string) {
    if (loading || lock.current || introduction.phase !== 'ready') return
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
    } catch (cause) {
      reset()
      setError(cause instanceof Error ? cause.message : 'AuRA could not start the conversation. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function send(text: string, action?: ChatAction) {
    if (!text.trim() || !conversation || lock.current || introduction.phase !== 'ready') return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await appendReply(conversation, text, action)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not reply. Please try sending your message again.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function deleteConversation(id: string): Promise<boolean> {
    if (loading || lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await chatService.deleteConversation(id)
      setConversations((current) => current.filter((item) => item.id !== id))
      if (activeId === id) {
        reset()
        setActiveId(null)
      }
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not delete this chat.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function updateMetadata(id: string, metadata: SessionMetadataUpdate): Promise<boolean> {
    if (loading || lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const updated = await chatService.updateConversationMetadata(id, metadata)
      setConversations((current) => current.map((item) => item.id === id ? updated : item))
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not update this chat session.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return {
    conversation,
    conversations,
    loading,
    busy,
    error,
    start,
    send,
    introduction,
    resume,
    newConversation,
    deleteConversation,
    updateMetadata,
  }
}
