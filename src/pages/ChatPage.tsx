import { Fragment, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAura } from '../contexts/AppContext'
import { ChatWindow } from '../components/chat/ChatWindow'
import { ChatMessage } from '../components/chat/ChatMessage'
import { ChatInput } from '../components/chat/ChatInput'
import { ChatActions } from '../components/chat/ChatActions'
import { ChatWelcome } from '../components/chat/ChatWelcome'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import { medicalLibrary } from '../data/medicalLibrary'
import type { ChatAction } from '../types/chat.types'

export function ChatPage({ educational = false }: { educational?: boolean }) {
  const { chat, assessment } = useAura()
  const navigate = useNavigate()
  const educationRequested = useRef(false)
  const { conversation, busy, start, send } = chat
  useEffect(() => {
    if (!educational) {
      educationRequested.current = false
      return
    }
    if (!conversation && !busy) {
      void start()
      return
    }
    if (conversation && !busy && !educationRequested.current) {
      educationRequested.current = true
      if (
        !conversation.messages.some((message) => message.type === 'education')
      )
        void send('I want to know about ASD', {
          id: 'education',
          label: 'I want to know about ASD',
        })
    }
  }, [educational, conversation, busy, start, send])

  function actionSelected(action: ChatAction) {
    if (action.id === 'assessment') {
      navigate('/assessment')
      void assessment.start()
    } else if (action.id === 'education') {
      navigate('/about-asd')
      void send(action.label, action)
      educationRequested.current = true
    } else void send(action.label, action)
  }

  const messages = conversation?.messages ?? []
  const educationalMessages = educational
    ? messages.slice(
        Math.max(
          0,
          messages.findIndex(
            (message) =>
              message.role === 'user' &&
              message.content === 'I want to know about ASD',
          ),
        ),
      )
    : messages
  return (
    <div className="conversation-page">
      {!conversation && !busy ? (
        <ChatWelcome onStart={() => void start()} busy={busy} />
      ) : (
        <ChatWindow
          scrollKey={`${messages.length}-${busy}`}
          className={`${messages.length === 1 ? 'initial-chat' : ''} ${educational ? 'education-chat' : ''}`}
        >
          {educationalMessages.map((message, index) => (
            <Fragment key={message.id}>
              <ChatMessage
                role={message.role}
                timestamp={message.timestamp}
                filled={
                  message.role === 'user' &&
                  message.type === 'text' &&
                  message.content !== 'I want to know about ASD'
                }
              >
                <p>{message.content}</p>
                {message.type === 'education' &&
                  message.content === medicalLibrary.furtherReading && (
                    <ul className="medical-links">
                      {medicalLibrary.sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {source.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
              </ChatMessage>
              {message.actions && index === educationalMessages.length - 1 && (
                <ChatActions
                  actions={message.actions}
                  onAction={actionSelected}
                  disabled={busy || assessment.busy}
                  stacked={messages.length === 1}
                />
              )}
            </Fragment>
          ))}
          {busy && <LoadingIndicator />}
        </ChatWindow>
      )}
      {chat.error && (
        <p className="error-message" role="alert">
          {chat.error}
        </p>
      )}
      {conversation && (
        <ChatInput onSend={(text) => send(text)} disabled={busy} />
      )}
    </div>
  )
}
