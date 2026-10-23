import {
  mockQuestions,
  getQuestionnaireQuestions,
  QUESTIONNAIRE_VERSION,
} from '../../data/mockQuestions.ts'
import { assessmentCopy } from '../../data/assessmentCopy.ts'
import type { AssessmentLanguage } from '../../types/questionnaire.types'
import type { AssessmentSession } from '../../types/assessment.types'
import {
  canCompleteAssessment,
  getAssessmentStage,
  scoreAnswer,
} from '../../utils/assessment.ts'
import { delay } from './delay.ts'

// Services return new values. The provider owns temporary state; no browser persistence.
export const mockAssessmentService = {
  async getQuestions(language: AssessmentLanguage = 'en') {
    await delay()
    return structuredClone(getQuestionnaireQuestions(language))
  },
  async createSession(language: AssessmentLanguage = 'en'): Promise<AssessmentSession> {
    getQuestionnaireQuestions(language)
    await delay()
    return {
      id: crypto.randomUUID(),
      language,
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
    if (!question || question.contentStatus !== 'approved')
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
    if (session.currentQuestionIndex === mockQuestions.length - 1) {
      if (!canCompleteAssessment(session, getQuestionnaireQuestions(session.language)))
        throw new Error('Please complete all questionnaire answers before finishing.')
      return { ...session, status: 'completed', completedAt: new Date().toISOString() }
    }
    const next = session.currentQuestionIndex + 1
    if (
      !mockQuestions[next] ||
      mockQuestions[next].contentStatus !== 'approved'
    )
      return {
        ...session,
        currentQuestionIndex: next,
        status: 'awaiting-content',
      }
    return { ...session, currentQuestionIndex: next }
  },
  // Developer preview only: fill missing responses with explicit fictional placeholders.
  async createProcessingPreview(session?: AssessmentSession | null, language: AssessmentLanguage = 'en'): Promise<AssessmentSession> {
    const current = session ?? await mockAssessmentService.createSession(language)
    if (current.questionnaireVersion !== QUESTIONNAIRE_VERSION)
      throw new Error('This preview requires the current questionnaire version.')
    if (mockQuestions.some((question) => question.contentStatus !== 'approved'))
      throw new Error('Preview is unavailable while questionnaire content awaits approval.')
    await delay()
    const timestamp = new Date().toISOString()
    const preview: AssessmentSession = {
      ...current,
      isDemoPreview: true,
      currentQuestionIndex: mockQuestions.length - 1,
      status: 'completed',
      completedAt: timestamp,
      answers: mockQuestions.map((question) => {
        const existing = current.answers.find((answer) => answer.questionId === question.id)
        const followUpText = assessmentCopy[current.language].previewResponse(question.questionNumber)
        return existing
          ? { ...existing, followUpText: existing.followUpText.trim() ? existing.followUpText : followUpText }
          : {
              questionId: question.id,
              selectedOptionId: 'sometimes',
              structuredScore: scoreAnswer(question, 'sometimes'),
              followUpText,
              answeredAt: timestamp,
            }
      }),
    }
    if (!canCompleteAssessment(preview, getQuestionnaireQuestions(preview.language)))
      throw new Error('The preview could not prepare a complete questionnaire.')
    return preview
  },
  getProgress(session: AssessmentSession) {
    return {
      current: session.currentQuestionIndex + 1,
      total: mockQuestions.length,
      answered: session.answers.filter((answer) => answer.followUpText.trim())
        .length,
      canComplete: canCompleteAssessment(session, getQuestionnaireQuestions(session.language)),
    }
  },
}
