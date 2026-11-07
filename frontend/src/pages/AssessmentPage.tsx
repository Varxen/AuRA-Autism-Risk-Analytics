import { useState } from 'react'
import { ClipboardCheck, PartyPopper } from 'lucide-react'
import type { AssessmentLanguage } from '../types/questionnaire.types'
import { assessmentCopy } from '../data/assessmentCopy'
import { AssessmentLanguageSelection } from '../components/assessment/AssessmentLanguageSelection'
import { useAura } from '../contexts/AppContext'
import { AssessmentExchange } from '../components/assessment/AssessmentExchange'
import { AssessmentProcessing } from '../components/assessment/AssessmentProcessing'
import { AssessmentResult } from '../components/assessment/AssessmentResult'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatWindow } from '../components/chat/ChatWindow'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import { Button } from '../components/ui/Button'
import { QUESTION_COUNT } from '../data/mockQuestions'

export function AssessmentPage() {
  const { assessment } = useAura()
  const [selectedLanguage, setSelectedLanguage] = useState<AssessmentLanguage | null>(null)
  const { session, stage, busy, loading, error, introduction, processing, pendingOptionId, pendingFollowUpText } = assessment
  const language = session?.language ?? selectedLanguage ?? 'en'
  const copy = assessmentCopy[language]
  const current = session ? Math.min(session.currentQuestionIndex + 1, QUESTION_COUNT) : 1
  const presenting = introduction.phase !== 'ready'
  const completed = stage === 'completed'
  const hasModelResult = completed && !processing.active && processing.result !== null
  const blocked = stage === 'awaiting-content'
  const needsRetry = stage === 'ready-next' && !busy && !presenting
  if (loading)
    return <div className="conversation-page assessment-language-entry" role="status"><LoadingIndicator label={language === 'fil' ? 'Kinukuha ang mga naka-save na assessment…' : 'Loading saved assessments…'} /></div>

  if (!session && !busy)
    return (
      <div className="conversation-page assessment-language-entry">
        <section className="assessment-language-panel">
          <AssessmentLanguageSelection value={selectedLanguage} onChange={setSelectedLanguage} />
          <p className="assessment-language-help">
            {language === 'fil'
              ? 'May 13 tanong at karagdagang tanong. Naka-save sa account ang progreso at mga sagot; gumamit ng kathang-isip na impormasyon.'
              : 'This questionnaire has 13 questions and follow-ups. Your answers are saved to your account; use fictional child information.'}
          </p>
          <Button variant="primary" disabled={!selectedLanguage} onClick={() => { if (selectedLanguage) void assessment.start(selectedLanguage) }}>
            {copy.start}
          </Button>
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    )

  return (
    <div className="conversation-page assessment-page" lang={language}>
      <ChatWindow
        key="assessment"
        scrollKey={`${stage}-${busy}-${introduction.phase}-${introduction.characters}-${processing.step?.id ?? 'finished'}`}
        busy={busy || presenting}
        preserveScrollOnRead
        className="assessment-messages"
      >
        {!session && introduction.phase === 'thinking' && (
          <ChatMessage className="message--typing"><LoadingIndicator label={copy.typingStatus} /></ChatMessage>
        )}
        {session && assessment.questions
          .filter((question) => question.questionNumber <= current && question.contentStatus === 'approved')
          .map((question) => (
            <AssessmentExchange
              key={question.id}
              question={question}
              session={session}
              introduction={introduction}
              pendingOptionId={pendingOptionId}
              pendingFollowUpText={pendingFollowUpText}
              busy={busy}
              onSelect={(id) => void assessment.select(id)}
            />
          ))}
        {processing.active && processing.step && (
          <AssessmentProcessing language={language} step={processing.step} />
        )}
        {session && completed && !processing.active && (
          <ChatMessage className="assessment-complete-message">
            <header className="assessment-completion-header">
              <PartyPopper className="assessment-completion-icon" aria-hidden="true" />
              <div className="assessment-completion-copy">
                <h2>{copy.completionTitle}</h2>
                <p>{copy.completionMessage}</p>
              </div>
              <ClipboardCheck className="assessment-completion-decoration" aria-hidden="true" />
            </header>
            <AssessmentResult language={language} result={processing.result} legacyPreview={session.isDemoPreview} />
          </ChatMessage>
        )}
        {session && blocked && (
          <section className="awaiting-content">
            <h2>{copy.blockedHeading(current)}</h2>
            <p>
              {copy.blockedMessage}
            </p>
          </section>
        )}
        {busy && !presenting && (
          <ChatMessage className="message--typing"><LoadingIndicator label={copy.typingStatus} /></ChatMessage>
        )}
      </ChatWindow>
      {hasModelResult && (
        <div className="assessment-complete-actions">
          <Button
            variant="primary"
            onClick={() => {
              assessment.newSession()
              setSelectedLanguage(null)
            }}
          >
            {copy.newAssessment}
          </Button>
        </div>
      )}
      {(error || needsRetry || processing.error || processing.failed) && (
        <div className="error-message" role="alert">
          <p>{error || processing.error || (processing.failed ? copy.processingFailed : copy.savedRetry)}</p>
          {needsRetry && (
            <Button disabled={busy} onClick={() => void assessment.retryAdvance()}>{copy.retry}</Button>
          )}
          {!needsRetry && (processing.error || processing.failed) && (
            <Button disabled={busy} onClick={() => void processing.retry()}>{copy.retry}</Button>
          )}
        </div>
      )}
      {!hasModelResult && <ChatInput
        onSend={assessment.followUp}
        responseLabel={copy.responseLabel}
        sendLabel={copy.sendLabel}
        disabled={busy || presenting || stage !== 'follow-up'}
        placeholder={
          processing.active ? copy.processingPlaceholder
          : presenting ? copy.inputPlaceholder
            : stage === 'question' ? copy.choosePlaceholder
              : stage === 'ready-next'
                ? (needsRetry ? copy.savedRetry : copy.preparingNext)
                : completed ? copy.completedPlaceholder
                  : blocked ? copy.blockedPlaceholder
                    : copy.inputPlaceholder
        }
      />}
    </div>
  )
}
