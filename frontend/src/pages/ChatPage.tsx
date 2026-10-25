import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAura } from '../contexts/AppContext'
import { ChatWindow } from '../components/chat/ChatWindow'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatActions } from '../components/chat/ChatActions'
import { ChatWelcome } from '../components/chat/ChatWelcome'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import type { ChatAction } from '../types/chat.types'

export function ChatPage() {
  const { chat, assessment } = useAura()
  const navigate = useNavigate()
  const { conversation, busy, loading, start, send, introduction } = chat
  const introducing = introduction.phase !== 'ready'

  function actionSelected(action: ChatAction) {
    if (action.id === 'assessment') {
      navigate('/assessment')
    } else void send(action.label, action)
  }

  const messages = conversation?.messages ?? []
  const hasEducation = messages.some((message) => message.type === 'education')
  return (
    <div className="conversation-page">
      {!conversation && !busy ? (
        <ChatWelcome onStart={() => void start()} busy={busy || loading} />
      ) : (
        <ChatWindow
          scrollKey={`${messages.length}-${busy}-${introduction.phase}-${introduction.characters}`}
          busy={busy || introducing}
          preserveScrollOnRead
          className={`${messages.length <= 1 ? 'initial-chat' : ''} ${hasEducation ? 'education-chat' : ''}`}
        >
          {(introduction.phase === 'opening' ? [] : messages).map((message, index) => (
            <Fragment key={message.id}>
              <ChatMessage
                role={message.role}
                timestamp={message.id === introduction.messageId && introducing ? undefined : message.timestamp}
                className={message.id === introduction.messageId && introduction.phase === 'thinking' ? 'message--typing' : ''}
                filled={
                  message.role === 'user' &&
                  message.type === 'text' &&
                  message.content !== 'I want to know about ASD'
                }
              >
                {message.id === introduction.messageId && introduction.phase === 'thinking' ? (
                  <LoadingIndicator />
                ) : (
                  <p>
                    {message.id === introduction.messageId && introduction.phase === 'typing'
                      ? message.content.slice(0, introduction.characters)
                      : message.content}
                    {message.id === introduction.messageId && introduction.phase === 'typing' && (
                      <span className="chat-typing-cursor" aria-hidden="true" />
                    )}
                  </p>
                )}
                {message.sources && message.sources.length > 0 &&
                  !(message.id === introduction.messageId && introducing) && (
                  <p className="knowledge-sources">
                    Source: {message.sources.join('; ')}
                  </p>
                )}
              </ChatMessage>
              {message.actions && index === messages.length - 1 &&
                (messages.length === 1 || !introducing) && (
                messages.length === 1 ? (
                  <div
                    className={`intro-actions${introducing ? '' : ' intro-actions--ready'}`}
                    aria-hidden={introducing}
                    inert={introducing}
                    onTransitionEnd={(event) => {
                      if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') return
                      event.currentTarget.scrollIntoView({
                        block: 'end',
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
                      })
                    }}
                  >
                    <div>
                      <ChatActions
                        actions={message.actions}
                        onAction={actionSelected}
                        disabled={busy || introducing || assessment.busy}
                        stacked
                      />
                    </div>
                  </div>
                ) : (
                  <ChatActions
                    actions={message.actions}
                    onAction={actionSelected}
                    disabled={busy || introducing || assessment.busy}
                  />
                )
              )}
            </Fragment>
          ))}
          {busy && introduction.phase !== 'opening' && !introducing &&
            (!conversation || messages.at(-1)?.role === 'user') && (
            <ChatMessage className="message--typing">
              <LoadingIndicator />
            </ChatMessage>
          )}
        </ChatWindow>
      )}
      {chat.error && (
        <p className="error-message" role="alert">
          {chat.error}
        </p>
      )}
      {(conversation || busy) && (
        <ChatInput onSend={(text) => send(text)} disabled={busy || introducing} />
      )}
    </div>
  )
}
