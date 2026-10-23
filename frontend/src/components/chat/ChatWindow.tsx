import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

export function ChatWindow({
  children,
  scrollKey,
  className = '',
  busy = false,
  preserveScrollOnRead = false,
}: {
  children: ReactNode
  scrollKey: string
  className?: string
  busy?: boolean
  preserveScrollOnRead?: boolean
}) {
  const end = useRef<HTMLDivElement>(null)
  const container = useRef<HTMLDivElement>(null)
  const followingLatest = useRef(true)
  useLayoutEffect(() => {
    if (preserveScrollOnRead) {
      if (followingLatest.current && container.current)
        container.current.scrollTo({ top: container.current.scrollHeight, behavior: 'instant' })
      return
    }
    end.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'end',
    })
  }, [scrollKey, preserveScrollOnRead])
  return (
    <div
      ref={container}
      onScroll={(event) => {
        const element = event.currentTarget
        followingLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
      }}
      className={`chat-window ${className}`}
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      aria-busy={busy}
      tabIndex={0}
    >
      {children}
      <div ref={end} />
    </div>
  )
}
