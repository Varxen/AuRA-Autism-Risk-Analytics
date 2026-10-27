import type { AssessmentConsistencyAttempt, AssessmentSession } from '../../types/assessment.types'
import type { ChatIntroduction } from '../../types/chat.types'
import type { QuestionnaireQuestion } from '../../types/questionnaire.types'
import { assessmentCopy } from '../../data/assessmentCopy'
import { ChatMessage } from '../chat/ChatMessage'
import { LoadingIndicator } from '../ui/LoadingIndicator'
import { AssessmentQuestion } from './AssessmentQuestion'
import { AnswerOptions } from './AnswerOptions'
import { FollowUpQuestion } from './FollowUpQuestion'
import { SuggestedAnswerCard } from './SuggestedAnswerCard'
import { Check } from 'lucide-react'

export function AssessmentExchange({
  question, session, introduction, pendingOptionId, pendingFollowUpText, failedAttempts, consistencyBlocked, busy, approvedAnswerId, onSelect, onApproveSuggestedAnswer, onKeepCurrentAnswer,
}: {
  question: QuestionnaireQuestion
  session: AssessmentSession
  introduction: ChatIntroduction
  pendingOptionId: string | null
  pendingFollowUpText: string | null
  failedAttempts: AssessmentConsistencyAttempt[]
  consistencyBlocked: boolean
  busy: boolean
  approvedAnswerId: string | null
  onSelect: (id: string) => void
  onApproveSuggestedAnswer: (optionId: string, followUpText: string) => void
  onKeepCurrentAnswer: (optionId: string, followUpText: string) => void
}) {
  const copy = assessmentCopy[session.language]
  const assessmentIntroduction = copy.introduction
  const answer = session.answers.find((item) => item.questionId === question.id)
  const current = session.status === 'in-progress' && question.questionNumber === session.currentQuestionIndex + 1
  const presenting = introduction.phase !== 'ready'
  const questionAnimating = presenting && introduction.messageId === `${session.id}:${question.id}:question`
  const followUpAnimating = presenting && introduction.messageId === `${session.id}:${question.id}:follow-up`
  const waiting = introduction.phase === 'opening' || introduction.phase === 'thinking'
  const questionTyping = questionAnimating && introduction.phase === 'typing'
  const followUpTyping = followUpAnimating && introduction.phase === 'typing'
  const firstQuestion = question.questionNumber === 1
  const questionOffset = firstQuestion ? assessmentIntroduction.length + 2 : 0
  const showQuestion = !(questionAnimating && waiting) && (!questionTyping || introduction.characters > questionOffset)
  const optionId = answer?.selectedOptionId ?? (current ? pendingOptionId : null)
  const followUpText = answer?.followUpText || (current ? pendingFollowUpText : null)
  const selectedOption = question.options.find((option) => option.id === optionId)
  const showFollowUp = (selectedOption?.score ?? answer?.structuredScore) !== 0 || Boolean(answer?.followUpText.trim())

  return (
    <section className="assessment-exchange" aria-label={copy.conversationLabel(question.questionNumber)}>
      {firstQuestion && !(questionAnimating && waiting) && (
        <ChatMessage timestamp={questionAnimating ? undefined : session.startedAt}>
          <p>
            {questionTyping ? assessmentIntroduction.slice(0, introduction.characters) : assessmentIntroduction}
            {questionTyping && !showQuestion && <span className="chat-typing-cursor" aria-hidden="true" />}
          </p>
        </ChatMessage>
      )}
      {showQuestion && (
        <AssessmentQuestion
          question={question}
          timestamp={questionAnimating ? undefined : session.startedAt}
          content={questionTyping ? question.mainQuestion?.slice(0, introduction.characters - questionOffset) : question.mainQuestion}
          typing={questionTyping}
        />
      )}
      {failedAttempts.map((attempt, index) => (
        <div className="assessment-consistency-attempt" key={`${question.id}-retry-${index}`}>
          <ChatMessage role="user" className="structured-response" filled>
            {question.options.find((option) => option.id === attempt.selectedOptionId)?.label ?? attempt.selectedOptionId}
          </ChatMessage>
          <FollowUpQuestion
            language={session.language}
            content={question.followUpQuestion ?? ''}
          />
          <ChatMessage role="user" filled><p>{attempt.followUpText}</p></ChatMessage>
          {attempt.suggestedOptionId ? (
            index === failedAttempts.length - 1 ? (
              <ChatMessage className="suggested-answer-message">
                <SuggestedAnswerCard
                  answer={question.options.find((option) => option.id === attempt.suggestedOptionId)?.label ?? attempt.suggestedOptionId}
                  language={session.language}
                  disabled={busy}
                  onApprove={() => onApproveSuggestedAnswer(attempt.suggestedOptionId!, attempt.followUpText)}
                  onKeepCurrent={() => onKeepCurrentAnswer(attempt.selectedOptionId, attempt.followUpText)}
                />
              </ChatMessage>
            ) : (
              <ChatMessage><p>{copy.suggestedAnswerDescription}</p></ChatMessage>
            )
          ) : (
            <ChatMessage>
              <p>{consistencyBlocked && index === failedAttempts.length - 1 ? copy.consistencyStop : copy.consistencyUnclearPrompt}</p>
            </ChatMessage>
          )}
        </div>
      ))}
      {consistencyBlocked && failedAttempts.length === 0 && (
        <ChatMessage><p>{copy.consistencyStop}</p></ChatMessage>
      )}
      {current && !presenting && !selectedOption && !consistencyBlocked && !failedAttempts.at(-1)?.suggestedOptionId && (
        <AnswerOptions language={session.language} options={question.options} onSelect={onSelect} disabled={busy} />
      )}
      {selectedOption && (
        <ChatMessage role="user" className="structured-response" filled timestamp={answer?.answeredAt}>
          <span>{selectedOption.label}</span>
          {approvedAnswerId === selectedOption.id && (
            <span className="approved-answer-label"><Check aria-hidden="true" size={14} />{copy.approved}</span>
          )}
        </ChatMessage>
      )}
      {(questionAnimating || followUpAnimating) && introduction.phase === 'thinking' && (
        <ChatMessage className="message--typing"><LoadingIndicator label={copy.typingStatus} /></ChatMessage>
      )}
      {showFollowUp && (answer || (current && pendingOptionId)) && question.followUpQuestion && !(followUpAnimating && waiting) && (
        <FollowUpQuestion
          language={session.language}
          content={followUpTyping ? question.followUpQuestion.slice(0, introduction.characters) : question.followUpQuestion}
          timestamp={followUpAnimating || !answer ? undefined : answer.answeredAt}
          typing={followUpTyping}
        />
      )}
      {followUpText && (
        <ChatMessage role="user" filled timestamp={pendingFollowUpText && current ? undefined : answer?.answeredAt}>
          <p>{followUpText}</p>
        </ChatMessage>
      )}
    </section>
  )
}
