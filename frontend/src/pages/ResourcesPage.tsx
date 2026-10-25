import { useState } from 'react'
import { ArrowUpRight, BookOpen, ClipboardList, HeartHandshake, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ContentPage } from '../components/ui/ContentPage'
import { resourceLibrary } from '../data/resourceLibrary'

const addedDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export function ResourcesPage() {
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState('All')
  const resources = resourceLibrary.filter((resource) =>
    (topic === 'All' || resource.topic === topic) &&
    `${resource.title} ${resource.publisher} ${resource.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <ContentPage eyebrow="A little understanding, at your pace" title="Resources" description="Explore trusted organizations and learn how AuRA's pre-assessment works.">
      <div className="content-notice">
        <BookOpen size={20} aria-hidden="true" />
        <p>These external references are in English. Source verification and clinical review are pending; approved Filipino resource summaries are not available yet.</p>
      </div>
      <section className="content-section" aria-labelledby="library-title">
        <h3 id="library-title">Learning library</h3>
        <div className="resource-tools">
          <label className="resource-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Search resources</span>
            <input type="search" placeholder="Search resources" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="resource-filters" role="group" aria-label="Resource topic">
            {['All', 'Autism', 'Development'].map((value) => (
              <button type="button" key={value} aria-pressed={topic === value} onClick={() => setTopic(value)}>{value}</button>
            ))}
          </div>
        </div>
        <p className="resource-count" role="status">{resources.length} {resources.length === 1 ? 'resource' : 'resources'}</p>
        {resources.length ? (
          <ul className="resource-grid">
            {resources.map((resource) => (
              <li key={resource.id} className="content-card resource-card">
                <span className="content-tag">{resource.topic}</span>
                <h4>{resource.title}</h4>
                <p>{resource.description}</p>
                <div className="resource-meta">
                  <span>{resource.publisher} · English</span>
                  <span>Added <time dateTime={resource.addedAt}>{addedDate.format(new Date(resource.addedAt))}</time> · Review pending</span>
                </div>
                <a href={resource.url} target="_blank" rel="noopener noreferrer" className="content-link">
                  Open source <ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only">: {resource.title} (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="content-empty"><p>No matching resources. Try another search or topic.</p><button type="button" className="content-link" onClick={() => { setQuery(''); setTopic('All') }}>Clear filters</button></div>
        )}
      </section>
      <section className="content-section" aria-labelledby="assessment-guide-title">
        <h3 id="assessment-guide-title">Before a pre-assessment</h3>
        <div className="content-grid">
          <article className="content-card">
            <ClipboardList className="content-card-icon" size={25} aria-hidden="true" />
            <h4>What to expect</h4>
            <p>Choose English or Tagalog, then answer 13 questions with a choice and a written explanation. You can revisit the conversation in History.</p>
            <Link to="/assessment" className="content-link">Explore the pre-assessment <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </article>
          <article className="content-card">
            <HeartHandshake className="content-card-icon" size={25} aria-hidden="true" />
            <h4>When you have questions</h4>
            <p>Discuss developmental concerns with a qualified healthcare professional. AuRA does not diagnose autism or replace a professional evaluation.</p>
            <Link to="/support" className="content-link">Get help using AuRA <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </article>
        </div>
      </section>
    </ContentPage>
  )
}
