import { useNavigate } from 'react-router-dom'
import { useAura } from '../contexts/AppContext'
import { ChatWelcome } from '../components/chat/ChatWelcome'

export function WelcomePage() {
  const { chat } = useAura()
  const navigate = useNavigate()
  const start = () => {
    void chat.start()
    navigate('/chat')
  }
  return (
    <div className="conversation-page">
      <ChatWelcome onStart={start} busy={chat.busy} />
    </div>
  )
}
