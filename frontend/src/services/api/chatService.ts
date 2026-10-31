import { chatReplyService, type ChatIntent } from './chatReplyService'
import type { ChatActionId, ChatTurn, Conversation } from '../../types/chat.types'
import type { SessionMetadataUpdate } from '../../types/history.types'

const basePath = '/api/v1/chats'

async function request(path = '', init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${basePath}${path}`, {
      ...init,
      credentials: 'include',
      cache: 'no-store',
      headers: init.body
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
    })
  } catch {
    throw new Error('Could not connect to AuRA. Start the backend and try again.')
  }
}

async function readBody<T>(response: Response, fallback: string): Promise<T> {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : null
    const message = error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
      ? error.message
      : fallback
    throw new Error(message)
  }
  return body as T
}

export const chatService = {
  async listConversations(): Promise<Conversation[]> {
    const response = await request()
    const body = await readBody<unknown>(response, 'AuRA could not load chat history.')
    if (!Array.isArray(body)) throw new Error('AuRA returned invalid chat history.')
    return body as Conversation[]
  },
  async createConversation(): Promise<Conversation> {
    const response = await request('', { method: 'POST' })
    return readBody<Conversation>(response, 'AuRA could not start the conversation.')
  },
  async respond(
    conversationId: string,
    text: string,
    turnId: string,
    action?: ChatActionId,
  ): Promise<ChatTurn> {
    // The trained intent model runs in the backend; if it is unavailable the
    // reply service falls back to its local keyword matcher.
    const intent = action ? null : await this.classifyIntent(text)
    const replies = await chatReplyService.respond(conversationId, text, action, intent)
    const response = await request(`/${conversationId}/turns`, {
      method: 'POST',
      body: JSON.stringify({
        turnId,
        userContent: text,
        assistantMessages: replies.map((message) => ({
          type: message.type,
          content: message.content,
          actions: message.actions,
          sources: message.sources,
        })),
      }),
    })
    return readBody<ChatTurn>(response, 'AuRA could not save this chat turn.')
  },
  async classifyIntent(text: string): Promise<ChatIntent | null> {
    try {
      const response = await request('/intent', { method: 'POST', body: JSON.stringify({ text }) })
      return response.ok ? (await response.json() as ChatIntent) : null
    } catch {
      return null
    }
  },
  async deleteConversation(id: string): Promise<void> {
    const response = await request(`/${id}`, { method: 'DELETE' })
    if (response.ok) return
    await readBody<unknown>(response, 'AuRA could not delete this chat.')
  },
  async updateConversationMetadata(id: string, metadata: SessionMetadataUpdate): Promise<Conversation> {
    const response = await request(`/${id}/metadata`, {
      method: 'PATCH',
      body: JSON.stringify(metadata),
    })
    return readBody<Conversation>(response, 'AuRA could not update this chat session.')
  },
}
