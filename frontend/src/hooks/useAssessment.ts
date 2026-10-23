import { useRef, useState } from 'react'
import { assessmentService } from '../services/api/assessmentService'
import { mockAssessmentService } from '../services/mock/mockAssessmentService'
import type { AssessmentSession, AssessmentSessionRecord } from '../types/assessment.types'
import type { AssessmentLanguage } from '../types/questionnaire.types'
import { getAssessmentStage } from '../utils/assessment'
import { useChatIntroduction } from './useChatIntroduction'
import { assessmentCopy } from '../data/assessmentCopy'
import { useAssessmentProcessing } from './useAssessmentProcessing'

export function useAssessment() {
  const [records, setRecords] = useState<AssessmentSessionRecord[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeRecord = records.find((record) => record.session.id === activeId)
  const session = activeRecord?.session ?? null
  const questions = activeRecord?.questions ?? []
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)
  const [pendingFollowUpText, setPendingFollowUpText] = useState<string | null>(null)
  const lock = useRef(false)
  const { introduction, begin, reveal, reset } = useChatIntroduction()
  const processing = useAssessmentProcessing(session)

  function saveRecord(record: AssessmentSessionRecord) {
    setRecords((current) => current.some((item) => item.session.id === record.session.id)
      ? current.map((item) => item.session.id === record.session.id ? record : item)
      : [...current, record])
    setActiveId(record.session.id)
  }

  function resume(id: string) {
    if (lock.current || !records.some((record) => record.session.id === id)) return false
    if (id !== activeId) reset()
    setActiveId(id)
    setError('')
    return true
  }

  function newSession() {
    if (lock.current) return false
    reset()
    setActiveId(null)
    setPendingOptionId(null)
    setPendingFollowUpText(null)
    setError('')
    return true
  }

  async function run(task: () => Promise<AssessmentSessionRecord>, interruptIntroduction = false) {
    if (lock.current || (!interruptIntroduction && introduction.phase !== 'ready')) return
    if (interruptIntroduction) reset()
    lock.current = true
    setBusy(true)
    setError('')
    try {
      saveRecord(await task())
    } catch (cause) {
      reset()
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      lock.current = false
      setBusy(false)
      setPendingOptionId(null)
      setPendingFollowUpText(null)
    }
  }

  async function start(language: AssessmentLanguage) {
    if (session) return
    await run(async () => {
      begin()
      const [items, created] = await Promise.all([
        assessmentService.getQuestions(language),
        assessmentService.createSession(language),
      ])
      reveal({
        id: `${created.id}:${items[created.currentQuestionIndex]?.id}:question`,
        content: `${assessmentCopy[language].introduction}\n\n${items[created.currentQuestionIndex]?.mainQuestion ?? ''}`,
      })
      return { session: created, questions: items }
    })
  }

  async function advance(currentSession: AssessmentSession) {
    const nextQuestion = questions[currentSession.currentQuestionIndex + 1]
    const revealingQuestion = nextQuestion?.contentStatus === 'approved'
    if (revealingQuestion) begin(`${currentSession.id}:${nextQuestion.id}:question`)
    const updated = await assessmentService.nextQuestion(currentSession)
    if (revealingQuestion) {
      if (updated.status === 'in-progress')
        reveal({ id: `${updated.id}:${nextQuestion.id}:question`, content: nextQuestion.mainQuestion ?? '' })
      else reset()
    }
    return updated
  }

  return {
    session,
    sessions: records.map((record) => record.session),
    resume,
    newSession,
    questions,
    busy,
    error,
    introduction,
    processing,
    pendingOptionId,
    pendingFollowUpText,
    start,
    skipToProcessing: (language?: AssessmentLanguage) => {
      const chosenLanguage = session?.language ?? language
      if (!chosenLanguage) return Promise.resolve()
      return run(async () => {
        const [items, preview] = await Promise.all([
          mockAssessmentService.getQuestions(chosenLanguage),
          mockAssessmentService.createProcessingPreview(session, chosenLanguage),
        ])
        return { session: preview, questions: items }
      }, true)
    },
    stage: session ? getAssessmentStage(session) : null,
    question: session ? questions[session.currentQuestionIndex] : undefined,
    answer: session?.answers.find(
      (answer) =>
        answer.questionId === questions[session.currentQuestionIndex]?.id,
    ),
    select: (optionId: string) =>
      session
        ? run(async () => {
            setPendingOptionId(optionId)
            begin(`${session.id}:${questions[session.currentQuestionIndex]?.id}:follow-up`)
            const updated = await assessmentService.saveStructuredAnswer(session, optionId)
            reveal({
              id: `${session.id}:${questions[session.currentQuestionIndex]?.id}:follow-up`,
              content: questions[session.currentQuestionIndex]?.followUpQuestion ?? '',
            })
            return { session: updated, questions }
          })
        : Promise.resolve(),
    followUp: (text: string) =>
      session
        ? run(async () => {
            setPendingFollowUpText(text)
            const answered = await assessmentService.saveFollowUp(session, text)
            saveRecord({ session: answered, questions })
            return { session: await advance(answered), questions }
          })
        : Promise.resolve(),
    retryAdvance: () =>
      session && getAssessmentStage(session) === 'ready-next'
        ? run(async () => ({ session: await advance(session), questions }))
        : Promise.resolve(),
  }
}
