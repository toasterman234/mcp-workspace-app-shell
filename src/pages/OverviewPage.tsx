import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAppStore } from '../state/useAppStore'
import { useHost } from '../hosts/useHost'
import { mergeToolRegistry, resolveToolPage, resolveToolRegistryRule } from '../mcp/registry/toolRegistry'
import { defaultToolRegistry } from '../config/defaultToolRegistry'

export function OverviewPage() {
  const tools = useAppStore((s) => s.tools)
  const settings = useAppStore((s) => s.settings)
  const connection = useAppStore((s) => s.connection)
  const host = useHost()
  const rules = useMemo(
    () => mergeToolRegistry(defaultToolRegistry(), settings.toolRegistry),
    [settings.toolRegistry],
  )

  return (
    <div className="page">
      <section className="section">
        <h2>Overview</h2>
        <p className="lead">
          Generic MCP workspace shell: discover tools, route them with a pattern registry, adapt payloads into
          reusable <code>ResultBlock</code> models, and render them with a single generic pipeline — plus optional
          domain adapters (portfolio, backtest, screener, ETF, jobs) when you want tighter layouts later.
        </p>
        <div className="card-grid">
          <div className="card">
            <h3>Host</h3>
            <p>{host.label}</p>
            <p className="muted small">Extensions: {host.capabilities.chatgptExtensions ? 'on' : 'off'}</p>
          </div>
          <div className="card">
            <h3>Connection</h3>
            <p>{connection}</p>
            <p className="muted small">Data mode: {settings.dataMode}</p>
          </div>
          <div className="card">
            <h3>Tools discovered</h3>
            <p>{tools.length ? `${tools.length} tools` : 'Run “Discover tools” in the top bar'}</p>
            <p className="muted small">
              <Link to="/catalog">Open tool catalog</Link>
            </p>
          </div>
        </div>
      </section>

      {tools.length ? (
        <section className="section">
          <h3>Tool → registry preview</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Page</th>
                  <th>Category</th>
                  <th>Adapter</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t) => {
                  const rule = resolveToolRegistryRule(t.name, rules)
                  return (
                    <tr key={t.name}>
                      <td>{t.name}</td>
                      <td>{resolveToolPage(t.name, rules)}</td>
                      <td>{rule.category}</td>
                      <td>
                        <code>{rule.adapterId}</code>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="section">
        <h3>Workspace areas</h3>
        <ul className="link-grid">
          <li>
            <Link to="/catalog">Tool catalog</Link>
          </li>
          <li>
            <Link to="/portfolio">Portfolio</Link>
          </li>
          <li>
            <Link to="/backtests">Backtests</Link>
          </li>
          <li>
            <Link to="/scanners">Scanners</Link>
          </li>
          <li>
            <Link to="/research">Research / ETF</Link>
          </li>
          <li>
            <Link to="/jobs">Jobs & Logs</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
      </section>
    </div>
  )
}
