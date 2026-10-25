export interface HistorySessionEntry {
  id: string
  kind: 'chat' | 'assessment'
  title: string
  summary: string
  details: string
  status: 'Ready to continue' | 'In progress' | 'Awaiting content' | 'Legacy preview · no result' | 'Classified' | 'Completed'
  updatedAt: string
  isDemoPreview: boolean
  isPinned: boolean
  isArchived: boolean
}

export interface SessionMetadataUpdate {
  customTitle?: string
  isPinned?: boolean
  isArchived?: boolean
}
