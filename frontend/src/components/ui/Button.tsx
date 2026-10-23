import type { ButtonHTMLAttributes } from 'react'

export function Button({
  className = '',
  variant = 'outline',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'outline' | 'primary'
}) {
  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`}
      {...props}
    />
  )
}
