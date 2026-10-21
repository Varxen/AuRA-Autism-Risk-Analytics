import { useRef, useState } from 'react'
import { assessmentService } from '../services/api/assessmentService'
import type { AssessmentSession } from '../types/assessment.types'
import type { QuestionnaireQuestion } from '../types/questionnaire.types'
import { getAssessmentStage } from '../utils/assessment'

export function useAssessment() {
  const [session, setSession] = useState<AssessmentSession | null>(null)
  const [questions, setQuestions] = useState<QuestionnaireQuestion[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function run(task: () => Promise<AssessmentSession>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      setSession(await task())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function start() {
    if (session) return
    await run(async () => {
      const [items, created] = await Promise.all([
        assessmentService.getQuestions(),
        assessmentService.createSession(),
      ])
      setQuestions(items)
      return created
    })
  }

  return {
    session,
    questions,
    busy,
    error,
    start,
    stage: session ? getAssessmentStage(session) : null,
    question: session ? questions[session.currentQuestionIndex] : undefined,
    answer: session?.answers.find(
      (answer) =>
        answer.questionId === questions[session.currentQuestionIndex]?.id,
    ),
    select: (optionId: string) =>
      session
        ? run(() => assessmentService.saveStructuredAnswer(session, optionId))
        : Promise.resolve(),
    followUp: (text: string) =>
      session
        ? run(() => assessmentService.saveFollowUp(session, text))
        : Promise.resolve(),
    next: () =>
      session
        ? run(() => assessmentService.nextQuestion(session))
        : Promise.resolve(),
  }
}
