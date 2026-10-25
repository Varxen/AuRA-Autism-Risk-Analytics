export type ChatActionId = 'education' | 'assessment' | 'learn-more'

export interface ChatAction {
  id: ChatActionId
  label: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: 'assistant' | 'user'
  type: 'text' | 'education' | 'actions'
  content: string
  timestamp: string
  actions?: ChatAction[]
  sources?: string[]
}

export interface Conversation {
  id: string
  messages: ChatMessage[]
  customTitle?: string | null
  isPinned?: boolean
  isArchived?: boolean
}

export interface ChatTurn {
  userMessage: ChatMessage
  assistantMessages: ChatMessage[]
}

export interface ChatIntroduction {
  messageId: string | null
  phase: 'ready' | 'opening' | 'thinking' | 'typing'
  characters: number
}
