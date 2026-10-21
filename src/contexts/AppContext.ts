import { createContext, useContext } from 'react'
import type { useChat } from '../hooks/useChat'
import type { useAssessment } from '../hooks/useAssessment'

export const AppContext = createContext<{
  chat: ReturnType<typeof useChat>
  assessment: ReturnType<typeof useAssessment>
} | null>(null)

export function useAura() {
  const context = useContext(AppContext)
  if (!context) throw new Error('useAura must be used within AppProvider')
  return context
}
