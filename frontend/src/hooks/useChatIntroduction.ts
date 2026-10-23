import { useEffect, useRef, useState } from 'react'
import type { ChatIntroduction, ChatMessage } from '../types/chat.types'
import { useReducedMotion } from './useReducedMotion'

export function useChatIntroduction() {
  const reducedMotion = useReducedMotion()
  const [message, setMessage] = useState<Pick<ChatMessage, 'id' | 'content'> | null>(null)
  const [introduction, setIntroduction] = useState<ChatIntroduction>({
    messageId: null, phase: 'ready', characters: 0,
  })
  const playback = useRef<((completed: boolean) => void) | null>(null)

  const firstMessage = message
  const { messageId, phase } = introduction
  useEffect(() => {
    if (phase !== 'ready') return
    playback.current?.(true)
    playback.current = null
  }, [phase])

  useEffect(() => () => {
    playback.current?.(false)
    playback.current = null
  }, [])

  useEffect(() => {
    if (phase !== 'opening') return
    const timer = window.setTimeout(() => {
      setIntroduction((current) => ({ ...current, phase: 'thinking' }))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (!firstMessage || messageId !== firstMessage.id || phase === 'ready' || phase === 'opening') return
    let timer: number
    if (reducedMotion) {
      timer = window.setTimeout(() => {
        setIntroduction({ messageId, phase: 'ready', characters: firstMessage.content.length })
      }, 0)
    } else if (phase === 'thinking') {
      timer = window.setTimeout(() => {
        setIntroduction({ messageId, phase: 'typing', characters: 0 })
      }, 900)
    } else {
      let characters = 0
      function typeCharacter() {
        if (!firstMessage) return
        characters += 1
        const finished = characters >= firstMessage.content.length
        setIntroduction({ messageId, phase: finished ? 'ready' : 'typing', characters })
        if (!finished)
          timer = window.setTimeout(typeCharacter, /[.!?,\n]/.test(firstMessage.content[characters - 1]) ? 160 : 26)
      }
      timer = window.setTimeout(typeCharacter, 26)
    }
    return () => window.clearTimeout(timer)
  }, [firstMessage, messageId, phase, reducedMotion])


  function begin(messageId: string | null = null) {
    setMessage(null)
    setIntroduction({ messageId, phase: 'opening', characters: 0 })
  }

  function reveal(nextMessage: Pick<ChatMessage, 'id' | 'content'>) {
    setMessage(nextMessage)
    setIntroduction((current) => ({ ...current, messageId: nextMessage.id }))
  }

  function reset() {
    playback.current?.(false)
    playback.current = null
    setMessage(null)
    setIntroduction({ messageId: null, phase: 'ready', characters: 0 })
  }

  function play(nextMessage: Pick<ChatMessage, 'id' | 'content'>): Promise<boolean> {
    playback.current?.(false)
    setMessage(nextMessage)
    setIntroduction({ messageId: nextMessage.id, phase: 'thinking', characters: 0 })
    return new Promise((resolve) => { playback.current = resolve })
  }

  return { introduction, begin, reveal, reset, play }
}
