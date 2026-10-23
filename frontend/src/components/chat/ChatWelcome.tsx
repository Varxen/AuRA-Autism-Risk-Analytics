import { AnimatedAuraAsset } from '../branding/AnimatedAuraAsset'
import { Button } from '../ui/Button'

export function ChatWelcome({
  onStart,
  busy,
}: {
  onStart: () => void
  busy: boolean
}) {
  return (
    <section className="welcome">
      <div className="welcome-art">
        <span className="orb orb--one" />
        <span className="orb orb--two" />
        <span className="orb orb--three" />
        <AnimatedAuraAsset className="aura-mascot welcome-animation" />
        <span className="orb orb--four" />
      </div>
      <h2>Welcome to AuRA</h2>
      <p>Your autism information assistant</p>
      <Button
        variant="primary"
        className="start-chat"
        disabled={busy}
        onClick={onStart}
      >
        {busy ? 'Starting…' : 'Start Chat'}
      </Button>
    </section>
  )
}
