import { informationKnowledgeBase } from '../../data/informationKnowledgeBase.ts'
import type {
  ChatActionId,
  ChatMessage,
  Conversation,
} from '../../types/chat.types'
import { delay } from './delay.ts'

const stopWords = new Set(
  'a an and are as at be but by can could did do does for from how i in is it may me my of on or the this to was what when where which who why with would you your ang ano ba bakit bilang buong dahil dapat din dito gusto ikaw ito ikaw ko kung lang maaaring mga mo naman ng niya o pag para paano paano ba po puwede sa siya sila tungkol tuwing wala with'.split(' '),
)

function tokens(value: string): string[] {
  return [...new Set(
    value
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]+/g)
      ?.filter((token) => token.length > 1 && !stopWords.has(token)) ?? [],
  )]
}

function findKnowledgeAnswer(input: string) {
  const query = tokens(input)
  if (!query.length) return null
  const broadAsdQuestion = query.every((token) => ['asd', 'autism'].includes(token))
  const ranked = informationKnowledgeBase.map((entry, index) => {
    const englishQuestion = tokens(entry.questionEn)
    const tagalogQuestion = tokens(entry.questionTl)
    const questions = [...englishQuestion, ...tagalogQuestion]
    const answers = tokens(`${entry.answerEn} ${entry.answerTl}`)
    const questionMatches = query.filter((token) => questions.includes(token)).length
    const answerMatches = query.filter((token) => answers.includes(token)).length
    const exactQuestion = [englishQuestion, tagalogQuestion].some((candidate) =>
      candidate.length === query.length && candidate.every((token, tokenIndex) => token === query[tokenIndex]),
    )
    return {
      entry,
      index,
      score: (questionMatches * 3 + answerMatches * 0.35) / query.length + (exactQuestion ? 8 : 0),
    }
  }).sort((left, right) => right.score - left.score || left.index - right.index)

  if (broadAsdQuestion) return ranked.find(({ entry }) => entry.questionEn === 'What is ASD?') ?? null
  return ranked[0].score >= 0.55 ? ranked[0] : null
}

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

function knowledgeMessage(conversationId: string, input: string) {
  const match = findKnowledgeAnswer(input)
  if (!match) {
    return message(
      conversationId,
      'I could not find that in my information knowledge base. Try asking about ASD, signs, screening, diagnosis, support, or where to seek help.',
      { type: 'education' },
    )
  }

  const useTagalog = /\b(ano|paano|bakit|kailan|saan|sino|puwede|puwede|nakakahawa|senyales|sanhi|dapat|magulang|bata)\b/i.test(input)
  return message(conversationId, useTagalog ? match.entry.answerTl : match.entry.answerEn, {
    type: 'education',
    sources: match.entry.sources,
  })
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
          'Hello! I’m AuRA, your autism information assistant.\n\nHow can I help you today?',
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

    if (action === 'education') {
      const intro = informationKnowledgeBase.find((item) => item.questionEn === 'What is ASD?')
      return [
        message(conversationId, intro?.answerEn ?? 'Please ask me an ASD question.', {
          type: 'education',
          sources: intro?.sources,
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

    if (action === 'learn-more') {
      return [message(
        conversationId,
        'Ask me about ASD characteristics, possible signs, screening, diagnosis, support, or finding a professional. I answer from the information knowledge base.',
        { type: 'education' },
      )]
    }

    return [knowledgeMessage(conversationId, input)]
  },
}
