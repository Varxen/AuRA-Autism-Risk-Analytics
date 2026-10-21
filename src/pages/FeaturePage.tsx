import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { AuraMascot } from '../components/branding/AuraMascot'
import { useAuthDemo } from '../contexts/AuthDemoContext'
import { Button } from '../components/ui/Button'

const descriptions: Record<string, string> = {
  Resources:
    'The resource library is under development. You can explore the reference-based ASD information in the meantime.',
  History:
    'Conversation history is under development. This demonstration keeps responses only in memory; reloading resets progress.',
  Support:
    'The support feature is under development. For questions about your child’s development, speak with a qualified healthcare professional.',
  Settings:
    'Settings are under development. This demonstration does not save child information or responses in browser storage.',
}

export function FeaturePage({ title }: { title: string }) {
  const { exit } = useAuthDemo()
  return (
    <section className="feature-page">
      <AuraMascot />
      <h2>{title}</h2>
      <span className="development-badge">
        <Construction size={16} />
        Under development
      </span>
      <p>
        {descriptions[title] ?? 'The page you requested could not be found.'}
      </p>
      {title === 'Settings' && <Button onClick={exit}>Sign out of demo</Button>}
      <Link to="/about-asd" className="button button--outline">
        Know About ASD
      </Link>
      <Link to="/chat" className="text-button">
        Return to chat
      </Link>
    </section>
  )
}
