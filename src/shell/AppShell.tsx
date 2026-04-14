import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SideNav } from './SideNav'
import { TopBar } from './TopBar'
import { LogsDrawer } from './LogsDrawer'

export function AppShell() {
  const [logsOpen, setLogsOpen] = useState(false)
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-main">
        <TopBar onToggleLogs={() => setLogsOpen((v) => !v)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
      <LogsDrawer open={logsOpen} onClose={() => setLogsOpen(false)} />
    </div>
  )
}
