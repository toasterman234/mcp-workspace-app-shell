import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Overview' },
  { to: '/catalog', label: 'Tool catalog' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/backtests', label: 'Backtests' },
  { to: '/scanners', label: 'Scanners' },
  { to: '/research', label: 'Research / ETF' },
  { to: '/jobs', label: 'Jobs & Logs' },
  { to: '/settings', label: 'Settings' },
]

export function SideNav() {
  return (
    <aside className="side-nav">
      <div className="brand">MCP Workspace</div>
      <nav className="nav-list" aria-label="Primary">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-foot">
        <span className="muted small">Read-only default</span>
      </div>
    </aside>
  )
}
