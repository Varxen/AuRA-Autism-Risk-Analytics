import { medicalLibrary } from '../../data/medicalLibrary.ts'
import type {
  ChatActionId,
  ChatMessage,
  Conversation,
} from '../../types/chat.types'
import { delay } from './delay.ts'

function message(
  conversationId: string,
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    conversationId,
    role: 'assistant',
    type: 'text',
    content,
    timestamp: new Date().toISOString(),
    ...extra,
  }
}

export const mockChatService = {
  async createConversation(): Promise<Conversation> {
    await delay()
    const id = crypto.randomUUID()
    return {
      id,
      messages: [
        message(
          id,
          'Hello! I’m AuRA, your autism risk assessment assistant.\n\nHow can I help you today?',
          {
            type: 'actions',
            actions: [
              { id: 'education', label: 'I want to know about ASD' },
              { id: 'assessment', label: 'Pre-assessment' },
            ],
          },
        ),
      ],
    }
  },
  async respond(
    conversationId: string,
    input: string,
    action?: ChatActionId,
  ): Promise<ChatMessage[]> {
    await delay()
    if (
      action === 'education' ||
      (!action && /\b(autism|asd)\b/i.test(input))
    ) {
      return [
        message(conversationId, medicalLibrary.introduction, {
          type: 'education',
        }),
        message(
          conversationId,
          'Would you like to learn more or start the pre-assessment?',
          {
            type: 'actions',
            actions: [
              { id: 'learn-more', label: 'Learn more' },
              { id: 'assessment', label: 'Pre-assessment' },
            ],
          },
        ),
      ]
    }
    if (action === 'learn-more')
      return [
        message(conversationId, medicalLibrary.furtherReading, {
          type: 'education',
        }),
      ]
    return [
      message(
        conversationId,
        'This demonstration uses predefined responses. You can explore the ASD information or try the pre-assessment.',
        {
          type: 'actions',
          actions: [
            { id: 'education', label: 'I want to know about ASD' },
            { id: 'assessment', label: 'Pre-assessment' },
          ],
        },
      ),
    ]
  },
}
