import type { ReactNode } from 'react'
import { AppContext } from '../../contexts/AppContext'
import { useChat } from '../../hooks/useChat'
import { useAssessment } from '../../hooks/useAssessment'

export function AppProvider({ children }: { children: ReactNode }) {
  const chat = useChat()
  const assessment = useAssessment()
  return (
    <AppContext.Provider value={{ chat, assessment }}>
      {children}
    </AppContext.Provider>
  )
}
