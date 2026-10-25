import { useEffect, useRef, useState } from 'react'
import { assessmentService } from '../services/api/assessmentService'
import type { AssessmentConsistencyAttempt, AssessmentSession, AssessmentSessionRecord } from '../types/assessment.types'
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
  const [failedAttempts, setFailedAttempts] = useState<AssessmentConsistencyAttempt[]>([])
  const [consistencyBlocked, setConsistencyBlocked] = useState(false)
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
      setFailedAttempts([])
      setConsistencyBlocked(false)
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
    setFailedAttempts([])
    setConsistencyBlocked(false)
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

  async function run(task: () => Promise<AssessmentSessionRecord>, interruptIntroduction = false) {
    if (loading || lock.current || (!interruptIntroduction && introduction.phase !== 'ready')) return
    if (interruptIntroduction) reset()
    lock.current = true
    setBusy(true)
    setError('')
    try {
      saveRecord(await task())
    } catch (cause) {
      reset()
      if (session) {
        try {
          saveRecord(await assessmentService.getSession(session.id))
          setError('')
        } catch {
          setError(cause instanceof Error ? cause.message : 'Something went wrong. Please try again.')
        }
      } else {
        setError(
          cause instanceof Error
            ? cause.message
            : 'Something went wrong. Please try again.',
        )
      }
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
    setFailedAttempts([])
    setConsistencyBlocked(false)
    return updated
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
    failedAttempts,
    consistencyBlocked: consistencyBlocked || Boolean(session?.consistencyBlocked),
    start,
    stage: session ? (pendingOptionId ? 'follow-up' : getAssessmentStage(session)) : null,
    question: session ? questions[session.currentQuestionIndex] : undefined,
    answer: session?.answers.find(
      (answer) =>
        answer.questionId === questions[session.currentQuestionIndex]?.id,
    ),
    select: (optionId: string) => {
      if (!session || lock.current || consistencyBlocked || session.consistencyBlocked) return
      const question = questions[session.currentQuestionIndex]
      if (!question?.options.some((option) => option.id === optionId)) return
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
      if (!session || !optionId || consistencyBlocked || session.consistencyBlocked)
        return Promise.resolve()
      return run(async () => {
        setPendingFollowUpText(text)
        const submission = await assessmentService.submitAnswer(session, optionId, text)
        if (!submission.consistency)
          throw new Error('AuRA did not return a consistency check. Please try again.')
        if (submission.consistency.nextAction !== 'continue') {
          setFailedAttempts((current) => [...current, { selectedOptionId: optionId, followUpText: text }])
          setConsistencyBlocked(submission.consistency.nextAction === 'stop_unresolved')
          return { session: submission.session, questions: submission.questions }
        }
        setFailedAttempts([])
        setConsistencyBlocked(false)
        return { session: await advance(submission.session), questions: submission.questions }
      })
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
