import { useAppStore } from '../state/useAppStore'
import type { AppSettings, DataMode, HostMode } from '../config/types'

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const resetSettings = useAppStore((s) => s.resetSettings)
  const tools = useAppStore((s) => s.tools)

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings({ [key]: value } as Partial<AppSettings>)
  }

  return (
    <div className="page">
      <h2>Settings</h2>
      <p className="muted">
        Persisted locally. MCPHub URL is only used in <strong>live</strong> mode.
      </p>

      <div className="settings-form">
        <label>
          App title
          <input
            value={settings.appTitle}
            onChange={(e) => update('appTitle', e.target.value)}
          />
        </label>
        <label>
          MCPHub base URL
          <input
            value={settings.mcphubBaseUrl}
            onChange={(e) => update('mcphubBaseUrl', e.target.value)}
            placeholder="https://mcphub.example.com"
          />
        </label>
        <label>
          MCP path on hub
          <input
            value={settings.mcphubMcpPath}
            onChange={(e) => update('mcphubMcpPath', e.target.value)}
            placeholder="/mcp"
          />
        </label>
        <label>
          Host mode
          <select
            value={settings.hostMode}
            onChange={(e) => update('hostMode', e.target.value as HostMode)}
          >
            <option value="auto">auto</option>
            <option value="generic">generic</option>
            <option value="chatgpt-extensions">chatgpt-extensions</option>
          </select>
        </label>
        <label>
          Data mode
          <select
            value={settings.dataMode}
            onChange={(e) => update('dataMode', e.target.value as DataMode)}
          >
            <option value="mock">mock</option>
            <option value="live">live (MCPHub)</option>
          </select>
        </label>

        <fieldset>
          <legend>Feature flags</legend>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.featureFlags.chatgptExtensions}
              onChange={(e) =>
                setSettings({
                  featureFlags: { ...settings.featureFlags, chatgptExtensions: e.target.checked },
                })
              }
            />
            ChatGPT extensions bridge (non-portable)
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.featureFlags.debugMcp}
              onChange={(e) =>
                setSettings({ featureFlags: { ...settings.featureFlags, debugMcp: e.target.checked } })
              }
            />
            Debug MCP logging
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.featureFlags.allowWriteTools}
              onChange={(e) =>
                setSettings({
                  featureFlags: { ...settings.featureFlags, allowWriteTools: e.target.checked },
                })
              }
            />
            Allow write tools (future — still blocked in v1 client unless wired)
          </label>
        </fieldset>

        <label>
          Tool registry (JSON array) — prepend rules; first pattern match wins. Fields: pattern, page, category,
          adapterId (generic | portfolio | backtest | screener | etf | jobs), sampleRenderer, optional description.
          <textarea
            rows={14}
            value={JSON.stringify(settings.toolRegistry, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value) as AppSettings['toolRegistry']
                if (Array.isArray(parsed)) update('toolRegistry', parsed)
              } catch {
                /* ignore invalid JSON while typing */
              }
            }}
          />
        </label>

        <div className="btn-row">
          <button type="button" className="btn" onClick={resetSettings}>
            Reset to defaults
          </button>
        </div>
      </div>

      <section className="section">
        <h3>Discovered tools ({tools.length})</h3>
        {tools.length === 0 ? (
          <p className="muted">Use “Discover tools” in the top bar.</p>
        ) : (
          <ul className="tool-list">
            {tools.map((t) => (
              <li key={t.name}>
                <code>{t.name}</code>
                {t.description ? <span className="muted"> — {t.description}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
