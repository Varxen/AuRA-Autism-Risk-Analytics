import type { Conversation } from '../types/chat.types'
import type { AssessmentSession } from '../types/assessment.types'
import type { HistorySessionEntry } from '../types/history.types'
import { QUESTION_COUNT } from '../data/mockQuestions.ts'

function excerpt(content: string, limit: number) {
  const singleLine = content.replace(/\s+/g, ' ').trim()
  return singleLine.length > limit ? `${singleLine.slice(0, limit)}...` : singleLine
}

export function getHistoryEntries(
  conversations: Conversation[],
  assessments: AssessmentSession[],
  completedProcessingIds: string[],
): HistorySessionEntry[] {
  const chats = conversations.map((conversation): HistorySessionEntry => {
    const firstUser = conversation.messages.find((message) => message.role === 'user')
    const lastMessage = conversation.messages.at(-1)
    return {
      id: conversation.id,
      kind: 'chat',
      title: firstUser ? excerpt(firstUser.content, 68) : 'ASD information chat',
      summary: excerpt(lastMessage?.content ?? '', 150),
      details: `${conversation.messages.length} messages`,
      status: 'Ready to continue',
      updatedAt: lastMessage?.timestamp ?? '',
      isDemoPreview: false,
    }
  })
  const sessions = assessments.map((session): HistorySessionEntry => {
    const language = session.language === 'fil' ? 'Tagalog' : 'English'
    const explanations = session.answers.filter((answer) => answer.followUpText.trim()).length
    return {
      id: session.id,
      kind: 'assessment',
      title: `Pre-assessment \u00b7 ${language}`,
      summary: session.status === 'completed'
        ? 'Your questionnaire and conversation are available to review.'
        : 'Continue from your saved question and follow-up conversation.',
      details: `Question ${Math.min(session.currentQuestionIndex + 1, QUESTION_COUNT)} of ${QUESTION_COUNT} \u00b7 ${explanations}/${QUESTION_COUNT} explanations`,
      status: session.status === 'completed'
        ? (completedProcessingIds.includes(session.id) ? 'Completed' : 'Processing preview')
        : session.status === 'awaiting-content' ? 'Awaiting content' : 'In progress',
      updatedAt: session.completedAt ?? session.answers.at(-1)?.answeredAt ?? session.startedAt,
      isDemoPreview: Boolean(session.isDemoPreview),
    }
  })
  return [...chats, ...sessions].sort((left, right) => (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0))
}
