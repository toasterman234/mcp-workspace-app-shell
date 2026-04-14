import { useAppStore } from '../state/useAppStore'

export function LogsDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logs = useAppStore((s) => s.logs)
  if (!open) return null
  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-label="Events and logs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h2>Events</h2>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="drawer-body">
          {logs.map((l) => (
            <div key={l.id} className={`log-line log-line--${l.level}`}>
              <div className="log-meta">
                <span>{new Date(l.ts).toLocaleTimeString()}</span>
                <span className="log-level">{l.level}</span>
              </div>
              <div>{l.message}</div>
              {l.detail ? <pre className="log-detail">{l.detail}</pre> : null}
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
