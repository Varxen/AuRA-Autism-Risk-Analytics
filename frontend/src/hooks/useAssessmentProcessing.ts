import { useEffect, useState } from 'react'
import { assessmentProcessingStepsByLanguage } from '../data/assessmentProcessingSteps'
import type { AssessmentSession } from '../types/assessment.types'

export function useAssessmentProcessing(session: AssessmentSession | null) {
  const [progress, setProgress] = useState<Record<string, number>>({})
  const assessmentProcessingSteps = assessmentProcessingStepsByLanguage[session?.language ?? 'en']
  const assessmentId = session?.status === 'completed' ? session.id : null
  const stepIndex = assessmentId ? progress[assessmentId] ?? 0 : 0
  const step = assessmentProcessingSteps[stepIndex]

  useEffect(() => {
    if (!assessmentId || !step) return
    const timer = window.setTimeout(() => {
      setProgress((current) => ({ ...current, [assessmentId]: stepIndex + 1 }))
    }, step.durationMs)
    return () => window.clearTimeout(timer)
  }, [assessmentId, step, stepIndex])

  return {
    completedSessionIds: Object.keys(progress).filter((id) => progress[id] >= assessmentProcessingSteps.length),
    active: Boolean(assessmentId && step),
    step: assessmentId ? step : undefined,
    stepNumber: stepIndex + 1,
    totalSteps: assessmentProcessingSteps.length,
  }
}
