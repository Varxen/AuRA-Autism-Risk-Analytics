import userProfilePicture from '../../assets/user_profile_picture.webp'
import { AuraMascot } from '../branding/AuraMascot'

export function Avatar({ role }: { role: 'assistant' | 'user' }) {
  return role === 'assistant' ? (
    <AuraMascot variant="avatar" className="message-avatar" decorative />
  ) : (
    <span className="user-avatar" aria-hidden="true">
      <img src={userProfilePicture} alt="" />
    </span>
  )
}
