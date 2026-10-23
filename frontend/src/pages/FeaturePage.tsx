import { Link } from 'react-router-dom'
import { AuraMascot } from '../components/branding/AuraMascot'

export function FeaturePage({ title }: { title: string }) {
  return (
    <section className="feature-page">
      <AuraMascot />
      <h2>{title}</h2>
      <p>The page you requested could not be found.</p>
      <Link to="/chat" className="text-button">Return to chat</Link>
    </section>
  )
}
