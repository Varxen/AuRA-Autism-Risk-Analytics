import { Link } from 'react-router-dom'
import { AuraMascot } from './AuraMascot'

export function AuraLogo({ animated = false }: { animated?: boolean } = {}) {
  return (
    <Link to="/" className="brand" aria-label="AuRA home">
      <AuraMascot variant={animated ? 'animated-head' : 'full'} decorative />
      <span>
        <strong>AuRA</strong>
        <span>
          Early Insights.
          <br />
          Brighter Futures.
        </span>
      </span>
    </Link>
  )
}
