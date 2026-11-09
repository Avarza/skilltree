import { History, House, Layers, LogOut, Network, Palette, Rocket, SlidersHorizontal } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

import { isAdmin, useAuth } from './auth-context'

const NAV = [
  { to: '/', label: 'Dashboard', icon: House, end: true },
  { to: '/templates', label: 'Skill Templates', icon: Layers },
  { to: '/theme', label: 'Theme Manager', icon: Palette },
  { to: '/config', label: 'App Config', icon: SlidersHorizontal },
  { to: '/releases', label: 'Content Releases', icon: Rocket },
]

export function Layout() {
  const { session, logout } = useAuth()
  const name = session?.email.split('@')[0] ?? ''
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="brand">
          <div className="brand-logo">
            <Network size={18} color="#04161C" />
          </div>
          <div className="col" style={{ gap: 0 }}>
            <strong>SkillTree</strong>
            <span className="overline">CMS</span>
          </div>
        </div>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
        {isAdmin(session?.role) ? (
          <NavLink to="/audit" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <History size={19} />
            Audit Log
          </NavLink>
        ) : null}
        <div className="sidebar-spacer" />
        <div className="account">
          <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
          <div className="col" style={{ gap: 0, minWidth: 0, flex: 1 }}>
            <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</strong>
            <span className="overline">{session?.role}</span>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Sign out" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
