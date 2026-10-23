import { medicalLibrary } from './medicalLibrary'
import type { LearningResource } from '../types/resource.types'

// Existing source links are reused. Added dates are not clinical review dates.
// Live source verification and stakeholder/clinical review remain pending.
export const resourceLibrary: LearningResource[] = [
  {
    id: 'cdc-autism',
    title: 'About autism spectrum disorder',
    publisher: 'CDC',
    topic: 'Autism',
    description: 'An introduction to autism from the Centers for Disease Control and Prevention.',
    url: medicalLibrary.sources[0].url,
    addedAt: '2026-10-23',
  },
  {
    id: 'who-autism',
    title: 'Autism fact sheet',
    publisher: 'World Health Organization',
    topic: 'Autism',
    description: 'The World Health Organization’s overview of autism and support.',
    url: medicalLibrary.sources[1].url,
    addedAt: '2026-10-23',
  },
  {
    id: 'cdc-milestones',
    title: 'Developmental milestones',
    publisher: 'CDC',
    topic: 'Development',
    description: 'Explore the CDC’s age-based developmental milestone resources.',
    url: 'https://www.cdc.gov/act-early/milestones/index.html',
    addedAt: '2026-10-23',
  },
]
