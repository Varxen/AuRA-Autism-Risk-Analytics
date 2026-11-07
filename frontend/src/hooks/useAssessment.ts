import { useEffect, useRef, useState } from 'react'
import { assessmentService } from '../services/api/assessmentService'
import type { AssessmentSession, AssessmentSessionRecord } from '../types/assessment.types'
import type { AssessmentLanguage } from '../types/questionnaire.types'
import type { SessionMetadataUpdate } from '../types/history.types'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null)
  const [pendingFollowUpText, setPendingFollowUpText] = useState<string | null>(null)
  const lock = useRef(false)
  const { introduction, begin, reveal, reset } = useChatIntroduction()
  const processing = useAssessmentProcessing(session, records)

  useEffect(() => {
    let cancelled = false
    assessmentService.listSessions().then((saved) => {
      if (!cancelled) setRecords(saved)
    }).catch((cause: unknown) => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : 'AuRA could not load saved assessments.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function saveRecord(record: AssessmentSessionRecord) {
    setRecords((current) => current.some((item) => item.session.id === record.session.id)
      ? current.map((item) => item.session.id === record.session.id ? record : item)
      : [...current, record])
    setActiveId(record.session.id)
  }

  function resume(id: string) {
    if (lock.current || !records.some((record) => record.session.id === id)) return false
    if (id !== activeId) {
      reset()
    }
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

  async function updateMetadata(id: string, metadata: SessionMetadataUpdate): Promise<boolean> {
    if (loading || lock.current) return false
    lock.current = true
    setBusy(true)
    setError('')
    try {
      const updated = await assessmentService.updateSessionMetadata(id, metadata)
      setRecords((current) => current.map((record) => record.session.id === id ? updated : record))
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'AuRA could not update this assessment session.')
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function run(task: () => Promise<AssessmentSessionRecord>, interruptIntroduction = false): Promise<boolean> {
    if (loading || lock.current || (!interruptIntroduction && introduction.phase !== 'ready')) return false
    if (interruptIntroduction) reset()
    lock.current = true
    setBusy(true)
    setError('')
    let succeeded = false
    try {
      saveRecord(await task())
      succeeded = true
    } catch (cause) {
      reset()
      const message = cause instanceof Error ? cause.message : 'Something went wrong. Please try again.'
      if (session) {
        try {
          saveRecord(await assessmentService.getSession(session.id))
        } catch { /* Keep the original submission error visible. */ }
      }
      setPendingFollowUpText(null)
      setError(message)
    } finally {
      lock.current = false
      setBusy(false)
      if (succeeded) {
        setPendingOptionId(null)
        setPendingFollowUpText(null)
      }
    }
    return succeeded
  }

  async function start(language: AssessmentLanguage) {
    if (session) return
    await run(async () => {
      begin()
      const created = await assessmentService.createSession(language)
      reveal({
        id: `${created.session.id}:${created.questions[created.session.currentQuestionIndex]?.id}:question`,
        content: `${assessmentCopy[language].introduction}\n\n${created.questions[created.session.currentQuestionIndex]?.mainQuestion ?? ''}`,
      })
      return created
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

  async function submitFollowUp(optionId: string, text: string): Promise<boolean> {
    if (!session) return false
    const question = questions[session.currentQuestionIndex]
    if (!question?.options.some((option) => option.id === optionId)) return false
    setPendingOptionId(optionId)
    setPendingFollowUpText(text)
    return run(async () => {
      const saved = await assessmentService.submitAnswer(session, optionId, text)
      return { session: await advance(saved.session), questions: saved.questions }
    })
  }

  return {
    session,
    sessions: records.map((record) => record.session),
    loading,
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
    stage: session
      ? pendingOptionId
        ? questions[session.currentQuestionIndex]?.options.find((option) => option.id === pendingOptionId)?.score === 0
          ? 'ready-next'
          : 'follow-up'
        : getAssessmentStage(session)
      : null,
    question: session ? questions[session.currentQuestionIndex] : undefined,
    answer: session?.answers.find(
      (answer) =>
        answer.questionId === questions[session.currentQuestionIndex]?.id,
    ),
    select: (optionId: string) => {
      if (!session || lock.current) return
      const question = questions[session.currentQuestionIndex]
      const selectedOption = question?.options.find((option) => option.id === optionId)
      if (!question || !selectedOption) return
      if (selectedOption.score === 0) {
        setPendingOptionId(optionId)
        setPendingFollowUpText(null)
        setError('')
        void run(async () => {
          const answered = await assessmentService.saveStructuredAnswer(session, optionId)
          return { session: await advance(answered), questions }
        }).then((succeeded) => {
          if (!succeeded) setPendingOptionId(null)
        })
        return
      }
      setPendingOptionId(optionId)
      setPendingFollowUpText(null)
      setError('')
      const messageId = `${session.id}:${question.id}:follow-up`
      begin(messageId)
      reveal({ id: messageId, content: question.followUpQuestion ?? '' })
    },
    followUp: (text: string) => {
      const activeQuestionId = session ? questions[session.currentQuestionIndex]?.id : undefined
      const savedOptionId = session?.answers.find((answer) => answer.questionId === activeQuestionId)?.selectedOptionId
      const optionId = pendingOptionId ?? savedOptionId ?? null
      if (!session || !optionId) return Promise.resolve(false)
      return submitFollowUp(optionId, text)
    },
    deleteSession: async (id: string) => {
      if (loading || lock.current) return false
      lock.current = true
      setBusy(true)
      setError('')
      try {
        await assessmentService.deleteSession(id)
        setRecords((current) => current.filter((record) => record.session.id !== id))
        if (activeId === id) {
          reset()
          setActiveId(null)
        }
        return true
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'AuRA could not delete this assessment.')
        return false
      } finally {
        lock.current = false
        setBusy(false)
      }
    },
    updateMetadata,
    retryAdvance: () =>
      session && getAssessmentStage(session) === 'ready-next'
        ? run(async () => ({ session: await advance(session), questions }))
        : Promise.resolve(),
  }
}
