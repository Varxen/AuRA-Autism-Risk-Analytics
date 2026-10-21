import { UserRound } from 'lucide-react'
import { AuraMascot } from '../branding/AuraMascot'

export function Avatar({ role }: { role: 'assistant' | 'user' }) {
  return role === 'assistant' ? (
    <AuraMascot variant="avatar" className="message-avatar" decorative />
  ) : (
    <span className="user-avatar" aria-hidden="true">
      <UserRound strokeWidth={2.5} />
    </span>
  )
}
