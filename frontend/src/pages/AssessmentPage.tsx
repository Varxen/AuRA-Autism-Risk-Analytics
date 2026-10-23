import { useState } from 'react'
import type { AssessmentLanguage } from '../types/questionnaire.types'
import { assessmentCopy } from '../data/assessmentCopy'
import { AssessmentLanguageSelection } from '../components/assessment/AssessmentLanguageSelection'
import { FastForward } from 'lucide-react'
import { useAura } from '../contexts/AppContext'
import { AssessmentProgress } from '../components/assessment/AssessmentProgress'
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
  const { session, stage, busy, error, introduction, processing, pendingOptionId, pendingFollowUpText } = assessment
  const language = session?.language ?? selectedLanguage ?? 'en'
  const copy = assessmentCopy[language]
  const current = session ? Math.min(session.currentQuestionIndex + 1, QUESTION_COUNT) : 1
  const presenting = introduction.phase !== 'ready'
  const completed = stage === 'completed'
  const blocked = stage === 'awaiting-content'
  const needsRetry = stage === 'ready-next' && !busy && !presenting
  const previewShortcut = !completed && (
    <div className="assessment-preview-shortcut">
      <span>{copy.demoShortcut}</span>
      <Button
        disabled={busy || blocked || (!session && !selectedLanguage)}
        title={copy.skipTitle}
        onClick={() => void assessment.skipToProcessing(selectedLanguage ?? undefined)}
      >
        <FastForward size={15} aria-hidden="true" />
        {copy.skip}
      </Button>
    </div>
  )

  if (!session && !busy)
    return (
      <div className="conversation-page assessment-language-entry">
        <section className="assessment-language-panel">
          <AssessmentLanguageSelection value={selectedLanguage} onChange={setSelectedLanguage} />
          <p className="assessment-language-help">
            {language === 'fil'
              ? 'May 13 tanong at mga karagdagang tanong ang demo na ito. Pansamantala lamang ang progreso; gumamit ng kathang-isip na mga sagot.'
              : 'This demo includes 13 questions and follow-ups. Progress is temporary; please use fictional responses.'}
          </p>
          <Button variant="primary" disabled={!selectedLanguage} onClick={() => { if (selectedLanguage) void assessment.start(selectedLanguage) }}>
            {copy.start}
          </Button>
          {previewShortcut}
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
    )

  return (
    <div className="conversation-page assessment-page" lang={language}>
      {previewShortcut}
      <AssessmentProgress language={language} current={current} total={QUESTION_COUNT} />
      {session?.isDemoPreview && (
        <p className="assessment-preview-notice">{copy.demoNotice}</p>
      )}
      <ChatWindow
        key={session?.isDemoPreview ? 'preview' : 'assessment'}
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
          <AssessmentProcessing language={language} step={processing.step} stepNumber={processing.stepNumber} totalSteps={processing.totalSteps} />
        )}
        {session && completed && !processing.active && (
          <ChatMessage className="assessment-complete-message">
            <h2>{copy.completionTitle}</h2>
            <p>{copy.completionMessage}</p>
            <AssessmentResult language={language} />
          </ChatMessage>
        )}
        {session && blocked && (
          <section className="awaiting-content">
            <h2>{copy.blockedHeading(current)}</h2>
            <p>
              {copy.blockedMessage}
            </p>
            <AssessmentResult language={language} />
          </section>
        )}
        {busy && !presenting && !pendingFollowUpText && (
          <ChatMessage className="message--typing"><LoadingIndicator label={copy.typingStatus} /></ChatMessage>
        )}
      </ChatWindow>
      {(error || needsRetry) && (
        <div className="error-message" role="alert">
          <p>{error || copy.savedRetry}</p>
          {needsRetry && (
            <Button disabled={busy} onClick={() => void assessment.retryAdvance()}>{copy.retry}</Button>
          )}
        </div>
      )}
      <ChatInput
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
      />
    </div>
  )
}
