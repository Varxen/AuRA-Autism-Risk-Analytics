import { AnimatedAuraAsset } from './AnimatedAuraAsset'
import headAnimation from '../../assets/head_robot_animated.mp4'
import headPoster from '../../assets/head_robot_poster.png'

export function AuraMascot({
  variant = 'full',
  className = '',
  decorative = false,
}: {
  variant?: 'full' | 'avatar' | 'animated-head'
  className?: string
  decorative?: boolean
}) {
  if (variant === 'animated-head')
    return (
      <AnimatedAuraAsset
        src={headAnimation}
        poster={headPoster}
        decorative={decorative}
        className={`aura-mascot aura-head-animation ${className}`}
      />
    )
  return (
    <img
      className={`aura-mascot ${className}`}
      src={`/assets/branding/aura-${variant === 'full' ? 'mascot' : 'avatar'}.png`}
      alt={decorative ? '' : 'AuRA, a smiling blue robot with pink accents'}
      draggable={false}
    />
  )
}
