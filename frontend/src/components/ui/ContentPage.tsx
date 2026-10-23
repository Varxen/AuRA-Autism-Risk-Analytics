import type { ReactNode } from 'react'
import '../../styles/content-pages.css'

export function ContentPage({ eyebrow, title, description, children }: {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="content-page" aria-labelledby="content-page-title">
      <div className="content-page-inner">
        <header className="content-page-heading">
          <span className="content-eyebrow">{eyebrow}</span>
          <h2 id="content-page-title">{title}</h2>
          <p>{description}</p>
        </header>
        {children}
      </div>
    </section>
  )
}
