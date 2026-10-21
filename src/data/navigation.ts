import {
  BookOpen,
  ClipboardList,
  Headphones,
  History,
  LibraryBig,
  MessageCircle,
  Settings,
} from 'lucide-react'

export const navigation = [
  { label: 'Chat', path: '/chat', icon: MessageCircle },
  { label: 'Know About ASD', path: '/about-asd', icon: BookOpen },
  { label: 'Assessments', path: '/assessment', icon: ClipboardList },
  { label: 'Resources', path: '/resources', icon: LibraryBig },
  { label: 'History', path: '/history', icon: History },
  { label: 'Support', path: '/support', icon: Headphones },
  { label: 'Settings', path: '/settings', icon: Settings },
]
