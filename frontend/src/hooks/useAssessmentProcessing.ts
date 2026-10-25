import { useEffect, useState } from 'react'
import { assessmentProcessingStepsByLanguage } from '../data/assessmentProcessingSteps'
import { assessmentService } from '../services/api/assessmentService'
import type { AssessmentProcessingJob, AssessmentSession, AssessmentSessionRecord } from '../types/assessment.types'

export function useAssessmentProcessing(session: AssessmentSession | null, sessions: AssessmentSessionRecord[]) {
  const assessmentId = session?.status === 'completed' && !session.isDemoPreview ? session.id : null
  const [jobState, setJobState] = useState<{ id: string | null; job: AssessmentProcessingJob | null; error: string }>({
    id: null,
    job: null,
    error: '',
  })
  const [completedSessionIds, setCompletedSessionIds] = useState<string[]>([])
  const [startingId, setStartingId] = useState<string | null>(null)
  const job = jobState.id === assessmentId ? jobState.job : null
  const error = jobState.id === assessmentId ? jobState.error : ''
  const language = session?.language ?? 'en'
  const steps = assessmentProcessingStepsByLanguage[language]

  useEffect(() => {
    if (!assessmentId) return
    let cancelled = false
    assessmentService.startProcessing(assessmentId).then((nextJob) => {
      if (!cancelled) {
        setJobState({ id: assessmentId, job: nextJob, error: '' })
        if (nextJob.status === 'completed')
          setCompletedSessionIds((current) => current.includes(assessmentId) ? current : [...current, assessmentId])
      }
    }).catch((cause: unknown) => {
      if (!cancelled) setJobState({
        id: assessmentId,
        job: null,
        error: cause instanceof Error ? cause.message : 'AuRA could not start processing.',
      })
    })
    return () => { cancelled = true }
  }, [assessmentId])

  async function retry() {
    if (!assessmentId) return
    setStartingId(assessmentId)
    setJobState((current) => ({ ...current, id: assessmentId, error: '' }))
    try {
      const nextJob = job?.status === 'running'
        ? await assessmentService.getProcessing(assessmentId)
        : job
          ? await assessmentService.retryProcessing(assessmentId)
          : await assessmentService.startProcessing(assessmentId)
      setJobState({ id: assessmentId, job: nextJob, error: '' })
      if (nextJob.status === 'running')
        setCompletedSessionIds((current) => current.filter((id) => id !== assessmentId))
      else if (nextJob.status === 'completed')
        setCompletedSessionIds((current) => current.includes(assessmentId) ? current : [...current, assessmentId])
    } catch (cause) {
      setJobState({
        id: assessmentId,
        job,
        error: cause instanceof Error ? cause.message : 'AuRA could not retry processing.',
      })
    } finally {
      setStartingId(null)
    }
  }

  const requestPending = Boolean(assessmentId && (jobState.id !== assessmentId || startingId === assessmentId))
  const step = job?.status === 'running' || requestPending ? steps[0] : undefined
  const completedFromHistory = sessions
    .filter((record) => record.processingJob?.status === 'completed')
    .map((record) => record.session.id)
  const result = job?.result ?? sessions.find((record) => record.session.id === assessmentId)?.processingJob?.result ?? null
  return {
    active: Boolean(step),
    step,
    stepNumber: 1,
    totalSteps: 1,
    result,
    error,
    failed: job?.status === 'failed',
    retry,
    completedSessionIds: [...new Set([...completedFromHistory, ...completedSessionIds])],
  }
}
