import { useAppStore } from '../state/useAppStore'
import { useHost } from '../hosts/useHost'

export function TopBar({ onToggleLogs }: { onToggleLogs: () => void }) {
  const title = useAppStore((s) => s.settings.appTitle)
  const connection = useAppStore((s) => s.connection)
  const dataMode = useAppStore((s) => s.settings.dataMode)
  const lastError = useAppStore((s) => s.lastError)
  const discoverTools = useAppStore((s) => s.discoverTools)
  const pingHub = useAppStore((s) => s.pingHub)
  const host = useHost()

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <h1 className="app-title">{title}</h1>
        <span className={`pill pill--${connection}`}>{connection}</span>
        <span className="pill pill--muted">{dataMode}</span>
        <span className="pill pill--readonly" title="Tool calls use readOnlyIntent; writes are future-only.">
          read-only
        </span>
      </div>
      <div className="top-bar-right">
        <span className="host-pill" title="Detected / configured host context">
          Host: {host.kind}
        </span>
        <button type="button" className="btn" onClick={() => void pingHub()}>
          Ping MCPHub
        </button>
        <button type="button" className="btn" onClick={() => void discoverTools()}>
          Discover tools
        </button>
        <button type="button" className="btn btn--ghost" onClick={onToggleLogs}>
          Logs
        </button>
      </div>
      {lastError ? <div className="top-error">{lastError}</div> : null}
    </header>
  )
}
