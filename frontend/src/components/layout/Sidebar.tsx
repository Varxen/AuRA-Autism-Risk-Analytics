import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Archive, ArchiveRestore, ChevronDown, LogOut, MessageCircle, MoreHorizontal, Pencil, Pin, Plus, Settings, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { navigation } from '../../data/navigation'
import { AuraLogo } from '../branding/AuraLogo'
import { useAura } from '../../contexts/AppContext'
import { useAuthDemo } from '../../contexts/AuthDemoContext'
import { getHistoryEntries } from '../../utils/history'
import type { SessionMetadataUpdate } from '../../types/history.types'
import userProfilePicture from '../../assets/user_profile_picture.webp'

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean
  onClose: () => void
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { chat, assessment } = useAura()
  const { state: authState, exit, busy: authBusy, error: authError } = useAuthDemo()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountFooterRef = useRef<HTMLDivElement>(null)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const [chatMenuPreference, setChatMenuPreference] = useState<{ pathname: string; open: boolean } | null>(null)
  const chatMenuOpen = chatMenuPreference?.pathname === pathname
    ? chatMenuPreference.open
    : pathname === '/chat' || pathname === '/'
  const [assessmentMenuPreference, setAssessmentMenuPreference] = useState<{ pathname: string; open: boolean } | null>(null)
  const [sessionMenu, setSessionMenu] = useState<{ key: string; top: number; left: number } | null>(null)
  const [renameDialog, setRenameDialog] = useState<{ key: string; currentTitle: string; value: string } | null>(null)
  const assessmentMenuOpen = assessmentMenuPreference?.pathname === pathname
    ? assessmentMenuPreference.open
    : pathname === '/assessment'
  const chatItem = navigation[0]
  const assessmentItem = navigation[1]
  const AssessmentIcon = assessmentItem?.icon
  const historyEntries = getHistoryEntries(
    chat.conversations,
    assessment.sessions,
    assessment.processing.completedSessionIds,
  )
  const chatEntries = historyEntries.filter((entry) => entry.kind === 'chat')
  const assessmentEntries = historyEntries.filter((entry) => entry.kind === 'assessment')

  function updateSession(key: string, update: SessionMetadataUpdate) {
    const [kind, id] = key.split(':', 2)
    if (!id) return Promise.resolve(false)
    return kind === 'chat' ? chat.updateMetadata(id, update) : assessment.updateMetadata(id, update)
  }

  function renderSessions(entries: typeof historyEntries) {
    return [...entries]
      .filter((entry) => !entry.isArchived)
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
      .map((entry) => {
        const key = `${entry.kind}:${entry.id}`
        const title = entry.title
        const active = entry.kind === 'chat' ? chat.conversation?.id === entry.id : assessment.session?.id === entry.id
        const open = entry.kind === 'chat' ? () => openChat(entry.id) : () => openAssessment(entry.id)
        return (
          <div className={`sidebar-session-row${entry.isPinned ? ' sidebar-session-row--pinned' : ''}`} key={key}>
            <button
              type="button"
              className={`sidebar-session-item ${active ? 'sidebar-session-item--active' : ''}`}
              data-session-id={entry.id}
              title={`${title} · ${entry.details}`}
              aria-current={active ? 'page' : undefined}
              disabled={chat.busy || assessment.busy}
              onClick={open}
            >
              <span className="sidebar-session-dot" aria-hidden="true" />
              <span className="sidebar-session-copy"><span>{title}</span><small>{entry.details}</small></span>
            </button>
            <button
              type="button"
              className="sidebar-session-options"
              aria-label={`Options for ${title}`}
              aria-expanded={sessionMenu?.key === key}
              title="Session options"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setSessionMenu(sessionMenu?.key === key ? null : {
                  key,
                  top: Math.min(rect.top, window.innerHeight - 150),
                  left: Math.min(rect.right + 4, window.innerWidth - 164),
                })
              }}
            ><MoreHorizontal size={17} aria-hidden="true" /></button>
          </div>
        )
      })
  }

  const archivedEntries = historyEntries.filter((entry) => entry.isArchived)
  const sessionMenuEntry = sessionMenu
    ? historyEntries.find((entry) => `${entry.kind}:${entry.id}` === sessionMenu.key)
    : undefined
  const sessionMenuTitle = sessionMenuEntry
    ? sessionMenuEntry.title
    : ''

  useEffect(() => {
    if (!sessionMenu) return
    function dismissMenu(event: PointerEvent) {
      if (!(event.target instanceof Element) || !event.target.closest('.sidebar-session-options, .sidebar-session-actions--portal'))
        setSessionMenu(null)
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSessionMenu(null)
    }
    document.addEventListener('pointerdown', dismissMenu)
    document.addEventListener('keydown', dismissOnEscape)
    return () => {
      document.removeEventListener('pointerdown', dismissMenu)
      document.removeEventListener('keydown', dismissOnEscape)
    }
  }, [sessionMenu])

  useEffect(() => {
    if (!accountMenuOpen) return
    accountFooterRef.current?.querySelector<HTMLButtonElement>('.sidebar-account-menu button')?.focus()
    function onPointerDown(event: PointerEvent) {
      if (!accountFooterRef.current?.contains(event.target as Node)) setAccountMenuOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setAccountMenuOpen(false)
      accountTriggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [accountMenuOpen])

  function openNewChat() {
    if (chat.busy || chat.loading || !chat.newConversation()) return
    setChatMenuPreference({ pathname: '/chat', open: true })
    navigate('/chat')
    onClose()
  }

  function openChat(id: string) {
    if (chat.busy || chat.loading || !chat.resume(id)) return
    setChatMenuPreference({ pathname: '/chat', open: true })
    navigate('/chat')
    onClose()
  }

  function openNewAssessment() {
    if (assessment.busy || assessment.loading || !assessment.newSession()) return
    setAssessmentMenuPreference({ pathname: '/assessment', open: true })
    navigate('/assessment')
    onClose()
  }

  function openAssessment(id: string) {
    if (assessment.busy || assessment.loading || !assessment.resume(id)) return
    setAssessmentMenuPreference({ pathname: '/assessment', open: true })
    navigate('/assessment')
    onClose()
  }

  function openSettingsSection(section: 'profile-settings' | 'account-settings') {
    setAccountMenuOpen(false)
    navigate(`/settings#${section}`)
    onClose()
  }

  async function signOut() {
    if (authBusy) return
    if (await exit()) {
      setAccountMenuOpen(false)
      navigate('/login', { replace: true })
      onClose()
    }
  }

  return (
    <aside
      className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}
      id="app-navigation"
      aria-label="Main navigation"
    >
      <button
        className="icon-button drawer-close"
        onClick={onClose}
        aria-label="Close navigation"
      >
        <X />
      </button>
      <AuraLogo animated />
      <nav aria-label="AuRA">
        {chatItem && (
          <div className="sidebar-session-group">
            <button
              type="button"
              className={`nav-link sidebar-session-trigger ${pathname === '/chat' || pathname === '/' ? 'nav-link--active' : ''}`}
              aria-expanded={chatMenuOpen}
              aria-controls="sidebar-chat-session-list"
              onClick={() => {
                setChatMenuPreference({ pathname: '/chat', open: !chatMenuOpen })
                if (pathname !== '/chat' && pathname !== '/') navigate('/chat')
              }}
            >
              <MessageCircle aria-hidden="true" />
              <span>{chatItem.label}</span>
              <ChevronDown className="sidebar-session-chevron" aria-hidden="true" />
            </button>
            {chatMenuOpen && (
              <div className="sidebar-session-menu" id="sidebar-chat-session-list">
                <button
                  type="button"
                  className="sidebar-session-item sidebar-session-new"
                  disabled={chat.busy || chat.loading}
                  onClick={openNewChat}
                >
                  <Plus size={17} aria-hidden="true" />
                  <span>New Chat</span>
                </button>
                {chat.loading ? (
                  <p className="sidebar-session-empty" role="status">Loading chats…</p>
                ) : chatEntries.some((entry) => !entry.isArchived) ? renderSessions(chatEntries) : (
                  <p className="sidebar-session-empty">No chat sessions yet</p>
                )}
              </div>
            )}
          </div>
        )}
        {assessmentItem && (
          <div className="sidebar-session-group">
            <button
              type="button"
              className={`nav-link sidebar-session-trigger ${pathname === '/assessment' ? 'nav-link--active' : ''}`}
              aria-expanded={assessmentMenuOpen}
              aria-controls="sidebar-assessment-session-list"
              onClick={() => {
                setAssessmentMenuPreference({ pathname: '/assessment', open: !assessmentMenuOpen })
                if (pathname !== '/assessment') navigate('/assessment')
              }}
            >
              {AssessmentIcon && <AssessmentIcon aria-hidden="true" />}
              <span>{assessmentItem.label}</span>
              <ChevronDown className="sidebar-session-chevron" aria-hidden="true" />
            </button>
            {assessmentMenuOpen && (
              <div className="sidebar-session-menu" id="sidebar-assessment-session-list">
                <button
                  type="button"
                  className="sidebar-session-item sidebar-session-new"
                  disabled={assessment.busy || assessment.loading}
                  onClick={openNewAssessment}
                >
                  <Plus size={17} aria-hidden="true" />
                  <span>New Assessment</span>
                </button>
                {assessment.loading ? (
                  <p className="sidebar-session-empty" role="status">Loading assessments…</p>
                ) : assessmentEntries.some((entry) => !entry.isArchived) ? renderSessions(assessmentEntries) : (
                  <p className="sidebar-session-empty">No assessment sessions yet</p>
                )}
              </div>
            )}
          </div>
        )}
        {navigation.slice(2).map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-link ${isActive || (path === '/chat' && pathname === '/') ? 'nav-link--active' : ''} ${path === '/settings' ? 'nav-link--settings' : ''}`
            }
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        {archivedEntries.length > 0 && (
          <div className="sidebar-session-archived">
            <span>Archived</span>
            {archivedEntries.map((entry) => {
              const key = `${entry.kind}:${entry.id}`
              return (
                <button key={key} type="button" onClick={() => void updateSession(key, { isArchived: false })} title={entry.title}>
                  <ArchiveRestore size={14} aria-hidden="true" />
                  <span>{entry.title}</span>
                </button>
              )
            })}
          </div>
        )}
      </nav>
      {sessionMenu && sessionMenuEntry && createPortal(
        <div className="sidebar-session-actions sidebar-session-actions--portal" role="menu" aria-label={`Options for ${sessionMenuTitle}`} style={{ top: sessionMenu.top, left: sessionMenu.left }}>
          <button type="button" role="menuitem" onClick={() => { void updateSession(sessionMenu.key, { isPinned: !sessionMenuEntry.isPinned }); setSessionMenu(null) }}><Pin size={15} aria-hidden="true" />{sessionMenuEntry.isPinned ? 'Unpin' : 'Pin'}</button>
          <button type="button" role="menuitem" onClick={() => {
            setRenameDialog({ key: sessionMenu.key, currentTitle: sessionMenuTitle, value: sessionMenuTitle })
            setSessionMenu(null)
          }}><Pencil size={15} aria-hidden="true" />Rename</button>
          <button type="button" role="menuitem" onClick={() => { void updateSession(sessionMenu.key, { isArchived: true }); setSessionMenu(null) }}><Archive size={15} aria-hidden="true" />Archive</button>
          <button type="button" role="menuitem" className="sidebar-session-delete-action" onClick={() => {
            const entry = sessionMenuEntry
            setSessionMenu(null)
            if (entry.kind === 'chat') void chat.deleteConversation(entry.id)
            else void assessment.deleteSession(entry.id)
          }}><Trash2 size={15} aria-hidden="true" />Delete</button>
        </div>,
        document.body,
      )}
      {renameDialog && createPortal(
        <div
          className="session-rename-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameDialog(null) }}
          onKeyDown={(event) => { if (event.key === 'Escape') setRenameDialog(null) }}
        >
          <form
            className="session-rename-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-rename-title"
            aria-describedby="session-rename-description"
            onSubmit={async (event) => {
              event.preventDefault()
              const title = renameDialog.value.trim()
              if (!title) return
              if (await updateSession(renameDialog.key, { customTitle: title.slice(0, 60) }))
                setRenameDialog(null)
            }}
          >
            <div className="session-rename-heading">
              <div className="session-rename-icon"><Pencil size={19} aria-hidden="true" /></div>
              <h2 id="session-rename-title">Rename session</h2>
            </div>
            <p id="session-rename-description">Choose a clear title so you can find this session again.</p>
            <input
              id="session-rename-input"
              aria-label="Session title"
              autoFocus
              maxLength={60}
              value={renameDialog.value}
              onChange={(event) => setRenameDialog({ ...renameDialog, value: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Escape') setRenameDialog(null) }}
            />
            <div className="session-rename-footer">
              <span>{renameDialog.value.length}/60</span>
              <div>
                <button type="button" className="session-rename-cancel" onClick={() => setRenameDialog(null)}>Cancel</button>
                <button type="submit" className="session-rename-save" disabled={chat.busy || assessment.busy || !renameDialog.value.trim() || renameDialog.value.trim() === renameDialog.currentTitle}>Save</button>
              </div>
            </div>
          </form>
        </div>,
        document.body,
      )}
      <div className="sidebar-footer" ref={accountFooterRef}>
        {accountMenuOpen && (
          <div className="sidebar-account-menu" role="dialog" aria-label="Account menu">
            <button type="button" onClick={() => openSettingsSection('profile-settings')}>
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span>Profile settings</span>
            </button>
            <button type="button" onClick={() => openSettingsSection('account-settings')}>
              <Settings size={17} aria-hidden="true" />
              <span>Account settings</span>
            </button>
            <div className="sidebar-account-separator" role="separator" />
            <button type="button" disabled={authBusy} onClick={() => void signOut()}>
              <LogOut size={17} aria-hidden="true" />
              <span>{authBusy ? 'Signing out…' : 'Log out'}</span>
            </button>
            {authError && <p className="sidebar-account-error" role="alert">{authError}</p>}
          </div>
        )}
        <button
          type="button"
          ref={accountTriggerRef}
          className={`sidebar-account-trigger ${accountMenuOpen ? 'sidebar-account-trigger--open' : ''}`}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          <img src={userProfilePicture} alt="" className="sidebar-account-avatar" />
          <span className="sidebar-account-copy">
            <strong>Parent / Guardian</strong>
            <small title={authState.identity?.email ?? ''}>{authState.identity?.email ?? 'AuRA account'}</small>
          </span>
          <ChevronDown className="sidebar-account-chevron" aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
