import { ArrowUpRight, HelpCircle, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ContentPage } from '../components/ui/ContentPage'
import { supportQuestions } from '../data/supportContent'

export function SupportPage() {
  return (
    <ContentPage eyebrow="Here to help you find your way" title="Support" description="Quick answers for using the AuRA frontend demo.">
      <div className="content-grid">
        <article className="content-card">
          <MessageCircle className="content-card-icon" size={25} aria-hidden="true" />
          <h3>Learn with AuRA</h3>
          <p>Use information chat for predefined ASD educational content, or explore the external resource library.</p>
          <Link to="/chat" className="content-link">Open information chat <ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link to="/resources" className="content-link">Browse resources <ArrowUpRight size={17} aria-hidden="true" /></Link>
        </article>
        <article className="content-card">
          <HelpCircle className="content-card-icon" size={25} aria-hidden="true" />
          <h3>Contact support</h3>
          <p>A support email and contact service have not been provided yet. Direct contact is under development; no message is sent from this page.</p>
          <span className="content-tag">Contact service under development</span>
        </article>
      </div>
      <section className="content-section" aria-labelledby="faq-title">
        <h3 id="faq-title">Frequently asked questions</h3>
        <div className="support-faq">
          {supportQuestions.map(({ question, answer }) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
      <p className="content-footnote">For concerns about your child’s development, speak with a qualified healthcare professional. This demo provides no clinical assessment or medical consultation.</p>
    </ContentPage>
  )
}
