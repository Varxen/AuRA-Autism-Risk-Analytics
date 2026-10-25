import {
  ClipboardList,
  Headphones,
  LibraryBig,
  MessageCircle,
  Settings,
} from 'lucide-react'

export const navigation = [
  { label: 'Chat', path: '/chat', icon: MessageCircle },
  { label: 'Assessments', path: '/assessment', icon: ClipboardList },
  { label: 'Resources', path: '/resources', icon: LibraryBig },
  { label: 'Support', path: '/support', icon: Headphones },
  { label: 'Settings', path: '/settings', icon: Settings },
]
