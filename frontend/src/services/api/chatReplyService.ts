import { informationKnowledgeBase } from '../../data/informationKnowledgeBase.ts'
import type {
  ChatActionId,
  ChatMessage,
  Conversation,
} from '../../types/chat.types'
import { delay } from '../mock/delay.ts'

export interface ChatIntent {
  decision: 'answer' | 'suggest' | 'fallback'
  question: string | null
  confidence: number
  suggestions: string[]
}

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

// Fixed replies for the non-knowledge-base intents the classifier also recognises.
const SMALL_TALK: Record<string, { en: string; tl: string }> = {
  Greeting: {
    en: 'Hello! I can answer questions about autism spectrum disorder (ASD), its signs, screening, diagnosis, and where to seek help. What would you like to know?',
    tl: 'Kumusta! Masasagot ko ang mga tanong tungkol sa autism spectrum disorder (ASD), mga senyales, screening, diagnosis, at kung saan hihingi ng tulong. Ano ang gusto mong malaman?',
  },
  Thanks: {
    en: 'You’re welcome! Ask me anything else about ASD.',
    tl: 'Walang anuman! Magtanong lang kung may iba ka pang gustong malaman tungkol sa ASD.',
  },
  Goodbye: {
    en: 'Goodbye! Come back any time you have questions.',
    tl: 'Paalam! Bumalik ka kung may iba ka pang tanong.',
  },
}

const FALLBACK_TEXT =
  'I could not find that in my information knowledge base. Try asking about ASD, signs, screening, diagnosis, support, or where to seek help.'

function knowledgeMessage(conversationId: string, input: string, intent?: ChatIntent | null) {
  if (intent?.decision === 'suggest' && intent.suggestions.length) {
    const options = intent.suggestions.map((question) => `• ${question}`).join('\n')
    return message(
      conversationId,
      `I’m not sure what you meant. Did you mean one of these?\n\n${options}\n\nAsk again using one of these questions.`,
      { type: 'education' },
    )
  }
  const smallTalk = intent?.decision === 'answer' && intent.question ? SMALL_TALK[intent.question] : undefined
  if (smallTalk) {
    const tagalog = /\b(kumusta|magandang|salamat|paalam|po)\b/i.test(input)
    return message(conversationId, tagalog ? smallTalk.tl : smallTalk.en)
  }
  // With a trained-model result, only an "answer" decision selects an entry;
  // without one (backend unavailable), fall back to local keyword matching.
  const entry = intent
    ? intent.decision === 'answer'
      ? informationKnowledgeBase.find((item) => item.questionEn === intent.question)
      : undefined
    : findKnowledgeAnswer(input)?.entry
  if (!entry) return message(conversationId, FALLBACK_TEXT, { type: 'education' })

  const useTagalog = /\b(ano|paano|bakit|kailan|saan|sino|puwede|puwede|nakakahawa|senyales|sanhi|dapat|magulang|bata)\b/i.test(input)
  return message(conversationId, useTagalog ? entry.answerTl : entry.answerEn, {
    type: 'education',
    sources: entry.sources,
  })
}

export const chatReplyService = {
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
            type: 'text',
          },
        ),
      ],
    }
  },
  async respond(
    conversationId: string,
    input: string,
    action?: ChatActionId,
    intent?: ChatIntent | null,
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

    return [knowledgeMessage(conversationId, input, intent)]
  },
}
