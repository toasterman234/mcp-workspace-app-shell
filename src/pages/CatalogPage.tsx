import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useAppStore } from '../state/useAppStore'
import { defaultToolRegistry } from '../config/defaultToolRegistry'
import { mergeToolRegistry, resolveToolRegistryRule, toolDisplayName } from '../mcp/registry/toolRegistry'
import { sampleRendererLabel } from '../lib/catalogCopy'

export function CatalogPage() {
  const tools = useAppStore((s) => s.tools)
  const settings = useAppStore((s) => s.settings)
  const rules = useMemo(
    () => mergeToolRegistry(defaultToolRegistry(), settings.toolRegistry),
    [settings.toolRegistry],
  )

  const rows = useMemo(() => {
    return tools.map((t) => {
      const rule = resolveToolRegistryRule(t.name, rules)
      return {
        tool: t.name,
        description: t.description ?? '—',
        category: rule.category,
        page: rule.page,
        adapterId: rule.adapterId,
        sampleRenderer: sampleRendererLabel(rule.sampleRenderer),
        ruleDescription: rule.description,
      }
    })
  }, [tools, rules])

  const byCategory = useMemo(() => {
    const m = new Map<string, typeof rows>()
    for (const r of rows) {
      const k = r.category
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(r)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  return (
    <div className="page">
      <h2>Tool catalog</h2>
      <p className="muted">
        Discovered MCP tools, registry routing, and the adapter that shapes results into{' '}
        <code>ResultBlock</code> views. All calls here are read-only; live write-capable tools stay disabled until
        explicitly enabled in settings and wired in the client.
      </p>

      <div className="catalog-note" role="status">
        <strong>Future live calls:</strong> “Discover tools” and page-level loads use{' '}
        <code>readOnlyIntent: true</code> today. Write paths will be gated behind feature flags and explicit UI
        actions.
      </div>

      {tools.length === 0 ? (
        <p className="muted">Use “Discover tools” in the top bar to populate this catalog.</p>
      ) : (
        <>
          <section className="section">
            <h3>Registry defaults (reference)</h3>
            <p className="muted small">
              Edit <code>toolRegistry</code> in Settings to prepend rules; first pattern match wins.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern</th>
                    <th>Page</th>
                    <th>Category</th>
                    <th>Adapter</th>
                    <th>Sample renderer</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {defaultToolRegistry().map((r) => (
                    <tr key={r.pattern}>
                      <td>
                        <code>{r.pattern}</code>
                      </td>
                      <td>{r.page}</td>
                      <td>{r.category}</td>
                      <td>
                        <code>{r.adapterId}</code>
                      </td>
                      <td>{sampleRendererLabel(r.sampleRenderer)}</td>
                      <td className="muted small">{r.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <h3>Discovered tools by category</h3>
            {byCategory.map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: 24 }}>
                <h4 style={{ marginBottom: 8 }}>{cat}</h4>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tool</th>
                        <th>Description</th>
                        <th>Mapped page</th>
                        <th>Adapter</th>
                        <th>Sample renderer</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((r) => (
                        <tr key={r.tool}>
                          <td>
                            <code>{r.tool}</code>
                          </td>
                          <td>{r.description}</td>
                          <td>{r.page}</td>
                          <td>
                            <code>{r.adapterId}</code>
                          </td>
                          <td>{r.sampleRenderer}</td>
                          <td>
                            <Link to={r.page === 'overview' ? '/' : `/${r.page}`} className="small">
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>

          <section className="section">
            <h3>Flat list</h3>
            <ul className="tool-list">
              {tools.map((t) => (
                <li key={t.name}>
                  <strong>{toolDisplayName(t.name)}</strong>
                  {t.description ? <span className="muted"> — {t.description}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
