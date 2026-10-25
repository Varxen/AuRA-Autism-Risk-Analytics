import { useState } from 'react'
import { ArrowUpRight, ClipboardList, History, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAura } from '../contexts/AppContext'
import { Button } from '../components/ui/Button'
import { getHistoryEntries } from '../utils/history'
import type { HistorySessionEntry } from '../types/history.types'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function HistoryPage() {
  const { chat, assessment } = useAura()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const entries = getHistoryEntries(chat.conversations, assessment.sessions, assessment.processing.completedSessionIds)

  function open(entry: HistorySessionEntry) {
    const restored = entry.kind === 'chat' ? chat.resume(entry.id) : assessment.resume(entry.id)
    if (restored) navigate(entry.kind === 'chat' ? '/chat' : '/assessment')
    else setError('This session could not be opened. Wait for the current request to finish and try again.')
  }

  return (
    <section className="history-page">
      <div className="history-header">
        <div>
          <span className="history-eyebrow">Your conversations</span>
          <h2>History</h2>
          <p>Return to a chat or continue an assessment.</p>
        </div>
        <div className="history-actions">
          <Button disabled={chat.busy || chat.loading} onClick={() => { if (chat.newConversation()) navigate('/chat') }}>
            <MessageCircle size={17} aria-hidden="true" /> New chat
          </Button>
          <Button disabled={assessment.busy} onClick={() => { if (assessment.newSession()) navigate('/assessment') }}>
            <Plus size={17} aria-hidden="true" /> New assessment
          </Button>
        </div>
      </div>
      <p className="history-memory-note">Chats and assessment answers are saved to your account until deleted from History. No automatic deletion schedule is set; use fictional child details.</p>
      {(error || chat.error || assessment.error) && <p role="alert" className="error-message">{error || chat.error || assessment.error}</p>}
      {chat.loading || assessment.loading ? (
        <p role="status">Loading saved history…</p>
      ) : entries.length === 0 ? (
        <div className="history-empty">
          <History size={36} aria-hidden="true" />
          <h3>No sessions yet</h3>
          <p>Start a chat or assessment. Your sessions will appear here so you can return to them.</p>
        </div>
      ) : (
        <ul className="history-list" aria-label="Saved sessions">
          {entries.map((entry) => {
            const Icon = entry.kind === 'chat' ? MessageCircle : ClipboardList
            const disabled = entry.kind === 'chat' ? chat.busy || chat.loading : assessment.busy
            return (
              <li key={`${entry.kind}-${entry.id}`} className="history-session-row">
                <button
                  type="button"
                  className="history-session"
                  data-session-id={entry.id}
                  data-session-kind={entry.kind}
                  disabled={disabled}
                  aria-label={`Open ${entry.kind}: ${entry.title}`}
                  onClick={() => open(entry)}
                >
                  <span className="history-session-icon"><Icon size={22} aria-hidden="true" /></span>
                  <span className="history-session-copy">
                    <span className="history-session-meta">
                      <span>{entry.kind === 'chat' ? 'Information chat' : 'Assessment'}</span>
                      <span className="history-status">{entry.status}</span>
                    </span>
                    <strong className="history-session-title">{entry.title}</strong>
                    <span className="history-session-summary">{entry.summary}</span>
                    <span className="history-session-details">
                      <span>{entry.details}</span>
                      <time dateTime={entry.updatedAt}>{Number.isNaN(Date.parse(entry.updatedAt)) ? 'Time unavailable' : dateFormat.format(new Date(entry.updatedAt))}</time>
                    </span>
                  </span>
                  <ArrowUpRight className="history-session-open" size={19} aria-hidden="true" />
                </button>
                {entry.kind === 'chat' ? (
                  <button
                    type="button"
                    className="history-session-delete"
                    aria-label={`Delete chat: ${entry.title}`}
                    disabled={chat.busy || chat.loading}
                    onClick={() => {
                      if (!window.confirm('Permanently delete this chat and all its messages?')) return
                      void chat.deleteConversation(entry.id).then((deleted) => {
                        if (deleted) setError('Chat and its messages were deleted.')
                      })
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="history-session-delete"
                    aria-label={`Delete assessment: ${entry.title}`}
                    disabled={assessment.busy}
                    onClick={() => {
                      if (!window.confirm('Permanently delete this assessment and all saved answers?')) return
                      void assessment.deleteSession(entry.id).then((deleted) => {
                        if (deleted) setError('Assessment and its answers were deleted.')
                      })
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
