import {
  mockQuestions,
  QUESTIONNAIRE_VERSION,
} from '../../data/mockQuestions.ts'
import type { AssessmentSession } from '../../types/assessment.types'
import {
  canCompleteAssessment,
  getAssessmentStage,
  scoreAnswer,
} from '../../utils/assessment.ts'
import { delay } from './delay.ts'

// Services return new values. The provider owns temporary state; no browser persistence.
export const mockAssessmentService = {
  async getQuestions() {
    await delay()
    return structuredClone(mockQuestions)
  },
  async createSession(): Promise<AssessmentSession> {
    await delay()
    return {
      id: crypto.randomUUID(),
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      status: 'in-progress',
      currentQuestionIndex: 0,
      answers: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
    }
  },
  async saveStructuredAnswer(
    session: AssessmentSession,
    optionId: string,
  ): Promise<AssessmentSession> {
    if (getAssessmentStage(session) !== 'question')
      throw new Error('This question already has an answer.')
    const question = mockQuestions[session.currentQuestionIndex]
    if (!question || question.contentStatus === 'awaiting-approval')
      throw new Error('This question is awaiting approved content.')
    const structuredScore = scoreAnswer(question, optionId)
    await delay()
    return {
      ...session,
      answers: [
        ...session.answers,
        {
          questionId: question.id,
          selectedOptionId: optionId,
          structuredScore,
          followUpText: '',
          answeredAt: new Date().toISOString(),
        },
      ],
    }
  },
  async saveFollowUp(
    session: AssessmentSession,
    text: string,
  ): Promise<AssessmentSession> {
    if (getAssessmentStage(session) !== 'follow-up' || !text.trim())
      throw new Error('Please describe your child’s response first.')
    if (text.length > 4000)
      throw new Error('Please keep your response within 4,000 characters.')
    await delay()
    return {
      ...session,
      answers: session.answers.map((answer) =>
        answer.questionId === mockQuestions[session.currentQuestionIndex].id
          ? {
              ...answer,
              followUpText: text,
              answeredAt: new Date().toISOString(),
            }
          : answer,
      ),
    }
  },
  async nextQuestion(session: AssessmentSession): Promise<AssessmentSession> {
    if (getAssessmentStage(session) !== 'ready-next')
      throw new Error('Please answer the follow-up before continuing.')
    await delay()
    const next = session.currentQuestionIndex + 1
    if (
      !mockQuestions[next] ||
      mockQuestions[next].contentStatus === 'awaiting-approval'
    )
      return {
        ...session,
        currentQuestionIndex: next,
        status: 'awaiting-content',
      }
    return { ...session, currentQuestionIndex: next }
  },
  getProgress(session: AssessmentSession) {
    return {
      current: session.currentQuestionIndex + 1,
      total: mockQuestions.length,
      answered: session.answers.filter((answer) => answer.followUpText.trim())
        .length,
      canComplete: canCompleteAssessment(session, mockQuestions),
    }
  },
}
