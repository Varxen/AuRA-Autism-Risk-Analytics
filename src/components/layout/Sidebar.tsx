import { NavLink, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { navigation } from '../../data/navigation'
import { AuraLogo } from '../branding/AuraLogo'

export function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean
  onClose: () => void
}) {
  const { pathname } = useLocation()
  return (
    <aside
      className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}
      id="app-navigation"
      aria-label="Main navigation"
    >
      <button
        className="icon-button drawer-close"
        onClick={onClose}
        aria-label="Close navigation"
      >
        <X />
      </button>
      <AuraLogo />
      <nav aria-label="AuRA">
        {navigation.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={onClose}
            className={({ isActive }) =>
              `nav-link ${isActive || (path === '/chat' && pathname === '/') ? 'nav-link--active' : ''} ${path === '/settings' ? 'nav-link--settings' : ''}`
            }
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <p className="sidebar-note">
        Every conversation brings
        <br className="desktop-break" /> us closer to better
        <br className="desktop-break" /> support.
      </p>
    </aside>
  )
}
