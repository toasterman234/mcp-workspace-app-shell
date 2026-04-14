import type { JsonValue } from '../mcp/types'

export function JsonViewer({ value, title = 'Raw JSON' }: { value: JsonValue | undefined; title?: string }) {
  const text = value === undefined ? '' : JSON.stringify(value, null, 2)
  return (
    <div className="panel json-panel">
      <div className="panel-header">{title}</div>
      <pre className="json-pre">{text}</pre>
    </div>
  )
}
