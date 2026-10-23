export interface HistorySessionEntry {
  id: string
  kind: 'chat' | 'assessment'
  title: string
  summary: string
  details: string
  status: 'Ready to continue' | 'In progress' | 'Awaiting content' | 'Processing preview' | 'Completed'
  updatedAt: string
  isDemoPreview: boolean
}
