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
}

export interface Conversation {
  id: string
  messages: ChatMessage[]
}
