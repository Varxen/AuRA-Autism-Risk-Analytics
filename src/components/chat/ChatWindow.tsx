import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function ChatWindow({
  children,
  scrollKey,
  className = '',
}: {
  children: ReactNode
  scrollKey: string
  className?: string
}) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'end',
    })
  }, [scrollKey])
  return (
    <div
      className={`chat-window ${className}`}
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      tabIndex={0}
    >
      {children}
      <div ref={end} />
    </div>
  )
}
