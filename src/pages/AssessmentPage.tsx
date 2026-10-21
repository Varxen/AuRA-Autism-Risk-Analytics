import { ArrowLeft, ChevronRight } from 'lucide-react'
import { useAura } from '../contexts/AppContext'
import { AssessmentProgress } from '../components/assessment/AssessmentProgress'
import { AssessmentQuestion } from '../components/assessment/AssessmentQuestion'
import { AnswerOptions } from '../components/assessment/AnswerOptions'
import { FollowUpQuestion } from '../components/assessment/FollowUpQuestion'
import { AssessmentResult } from '../components/assessment/AssessmentResult'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatWindow } from '../components/chat/ChatWindow'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import { Button } from '../components/ui/Button'
import { useState } from 'react'

export function AssessmentPage() {
  const { assessment } = useAura()
  const { session, question, answer, stage, busy, error } = assessment
  const [reviewQuestion, setReviewQuestion] = useState(false)
  const selectedOption = assessment.questions[0]?.options.find(
    (option) => option.id === session?.answers[0]?.selectedOptionId,
  )
  const firstQuestion = assessment.questions[0]
  const showingQuestion = stage === 'question' || reviewQuestion
  const current = session ? Math.min(session.currentQuestionIndex + 1, 13) : 1

  if (!session)
    return (
      <div className="conversation-page">
        <section className="intro-page">
          <h2>A little understanding starts here.</h2>
          <p>
            This frontend demonstration includes one question from the design
            reference. It cannot provide a clinical screening result.
          </p>
          <p>
            Progress is temporary and resets when you reload. Please use
            fictional responses.
          </p>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => void assessment.start()}
          >
            {busy ? 'Preparing…' : 'Start pre-assessment'}
          </Button>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    )

  return (
    <div className="conversation-page assessment-page">
      <AssessmentProgress current={current} total={13} />
      <ChatWindow
        scrollKey={`${stage}-${busy}-${reviewQuestion}`}
        className="assessment-messages"
      >
        {stage === 'awaiting-content' ? (
          <section className="awaiting-content">
            <h2>Question {current} is awaiting approved content</h2>
            <p>
              Your demonstration answer for Question 1 is saved in this session.
              Questions 2–13 need approved wording before you can continue.
            </p>
            <AssessmentResult />
            <Button onClick={() => setReviewQuestion(!reviewQuestion)}>
              <ArrowLeft size={18} />
              {reviewQuestion ? 'Close saved answer' : 'Review saved answer'}
            </Button>
            {reviewQuestion && (
              <div className="saved-answer">
                <h3>Question 1 · Eye Contact</h3>
                <p>{firstQuestion?.mainQuestion}</p>
                <p>
                  <strong>Selected answer:</strong> {selectedOption?.label}
                </p>
                <p>
                  <strong>Your explanation:</strong>{' '}
                  {session.answers[0]?.followUpText}
                </p>
              </div>
            )}
          </section>
        ) : (
          <>
            {showingQuestion && question && (
              <>
                <ChatMessage timestamp={session.startedAt}>
                  <p>
                    Let’s begin the pre-assessment. I will ask you questions
                    about your child’s behavior.
                  </p>
                </ChatMessage>
                <AssessmentQuestion
                  question={question}
                  timestamp={session.startedAt}
                />
                <AnswerOptions
                  options={question.options}
                  onSelect={(id) => void assessment.select(id)}
                  disabled={busy || Boolean(answer)}
                />
                {answer && (
                  <ChatMessage
                    role="user"
                    className="structured-response"
                    timestamp={answer.answeredAt}
                  >
                    {
                      question.options.find(
                        (option) => option.id === answer.selectedOptionId,
                      )?.label
                    }
                  </ChatMessage>
                )}
              </>
            )}
            {!showingQuestion && question?.followUpQuestion && (
              <>
                <FollowUpQuestion
                  content={question.followUpQuestion}
                  timestamp={answer?.answeredAt ?? session.startedAt}
                />
                {answer?.followUpText && (
                  <ChatMessage role="user" filled timestamp={answer.answeredAt}>
                    <p>{answer.followUpText}</p>
                  </ChatMessage>
                )}
                {stage === 'ready-next' && (
                  <div className="next-question-row">
                    <ChatMessage timestamp={answer?.answeredAt}>
                      <Button
                        disabled={busy}
                        onClick={() => void assessment.next()}
                      >
                        Next question <ChevronRight size={20} />
                      </Button>
                    </ChatMessage>
                  </div>
                )}
                <button
                  className="text-button review-answer"
                  onClick={() => setReviewQuestion(true)}
                >
                  <ArrowLeft size={15} />
                  Review structured answer
                </button>
              </>
            )}
            {reviewQuestion && stage !== 'question' && (
              <Button
                className="continue-followup"
                onClick={() => setReviewQuestion(false)}
              >
                Return to follow-up <ChevronRight size={18} />
              </Button>
            )}
          </>
        )}
        {busy && <LoadingIndicator />}
      </ChatWindow>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <ChatInput
        onSend={assessment.followUp}
        disabled={busy || stage !== 'follow-up' || reviewQuestion}
        placeholder={
          stage === 'question'
            ? 'Choose an answer above...'
            : stage === 'ready-next'
              ? 'Select Next question to continue...'
              : stage === 'awaiting-content'
                ? 'Awaiting approved questionnaire content...'
                : 'Type your response...'
        }
      />
    </div>
  )
}
