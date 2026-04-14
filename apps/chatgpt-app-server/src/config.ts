export type ServerMode = 'mock' | 'live'

export interface AppServerConfig {
  port: number
  mode: ServerMode
  baseUrl: string
  widgetJsPath: string
  allowWriteThrough: boolean
  workspaceToolAllowlist: string[]
  workspaceToolDenylist: string[]
  mcphubBaseUrl: string
  mcphubMcpPath: string
  mcphubAuthHeader?: string
  timeoutMs: number
  /** When true, log MCPHub request/response details (no secrets) and enable /debug/mcp-tool. */
  mcpDebug: boolean
}

function asBool(v: string | undefined, fallback = false): boolean {
  if (!v) return fallback
  return v === '1' || v.toLowerCase() === 'true'
}

function asCsvList(v: string | undefined): string[] {
  if (!v) return []
  return v
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function loadConfig(): AppServerConfig {
  const port = Number(process.env.PORT ?? 8787)
  const mode = (process.env.APP_SERVER_MODE ?? 'mock') as ServerMode
  const baseUrl =
    process.env.APP_BASE_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    `http://localhost:${port}`
  const defaultWidgetPath = '/assets/workspace-widget.js?v=20260414c'
  const rawWidgetPath = process.env.WIDGET_JS_PATH ?? defaultWidgetPath
  const widgetJsPath =
    rawWidgetPath.startsWith('http://') || rawWidgetPath.startsWith('https://')
      ? rawWidgetPath
      : `${baseUrl}${rawWidgetPath.startsWith('/') ? '' : '/'}${rawWidgetPath}`
  return {
    port: Number.isFinite(port) ? port : 8787,
    mode: mode === 'live' ? 'live' : 'mock',
    baseUrl,
    // Always prefer absolute URL for widget script to avoid ui:// relative-path resolution issues.
    widgetJsPath,
    allowWriteThrough: asBool(process.env.ALLOW_WRITE_THROUGH, false),
    workspaceToolAllowlist: asCsvList(process.env.WORKSPACE_TOOL_ALLOWLIST),
    workspaceToolDenylist: asCsvList(process.env.WORKSPACE_TOOL_DENYLIST),
    // Default assumes MCPHub is published to the host via Docker port mapping.
    // Override with MCPHUB_BASE_URL if your mapping differs.
    mcphubBaseUrl: process.env.MCPHUB_BASE_URL ?? 'http://127.0.0.1:3005',
    mcphubMcpPath: process.env.MCPHUB_MCP_PATH ?? '/mcp',
    mcphubAuthHeader: process.env.MCPHUB_AUTH_HEADER,
    timeoutMs: Number(process.env.MCPHUB_TIMEOUT_MS ?? 20_000),
    mcpDebug: asBool(process.env.MCP_DEBUG, false),
  }
}
