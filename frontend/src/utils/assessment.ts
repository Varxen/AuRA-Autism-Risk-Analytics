import { QUESTION_COUNT } from '../data/mockQuestions.ts'
import type {
  AssessmentSession,
  AssessmentStage,
} from '../types/assessment.types'
import type { QuestionnaireQuestion } from '../types/questionnaire.types'

export function scoreAnswer(
  question: QuestionnaireQuestion,
  optionId: string,
): number {
  const option = question.options.find((item) => item.id === optionId)
  if (!option) throw new Error('Please choose one of the available answers.')
  return option.score
}

export function getAssessmentStage(
  session: AssessmentSession,
): AssessmentStage {
  if (session.status === 'completed') return 'completed'
  if (session.status === 'awaiting-content') return 'awaiting-content'
  const answer = session.answers.find(
    (item) => item.questionId === `q${session.currentQuestionIndex + 1}`,
  )
  if (!answer) return 'question'
  return answer.followUpText.trim() ? 'ready-next' : 'follow-up'
}

export function canCompleteAssessment(
  session: AssessmentSession,
  questions: QuestionnaireQuestion[],
): boolean {
  return (
    questions.length === QUESTION_COUNT &&
    questions.every(
      (question) =>
        question.contentStatus === 'approved' &&
        question.language === session.language &&
        question.questionnaireVersion === session.questionnaireVersion &&
        Boolean(question.mainQuestion && question.followUpQuestion) &&
        session.answers.some(
          (answer) =>
            answer.questionId === question.id &&
            question.options.some(
              (option) =>
                option.id === answer.selectedOptionId &&
                option.score === answer.structuredScore,
            ) &&
            Boolean(answer.followUpText.trim()),
        ),
    )
  )
}
