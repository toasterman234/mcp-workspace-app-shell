import type { AppSettings } from './types'
import { defaultFeatureFlags } from './types'
import { defaultToolRegistry } from './defaultToolRegistry'

export const defaultAppSettings = (): AppSettings => ({
  appTitle: 'MCP Workspace',
  // TODO: Point this at your MCPHub HTTP/streamable endpoint when using live mode.
  // Default assumes MCPHub is published to the host via Docker port mapping.
  // Override in Settings if your mapping differs.
  mcphubBaseUrl: 'http://127.0.0.1:3005',
  mcphubMcpPath: '/mcp',
  hostMode: 'auto',
  dataMode: 'mock',
  featureFlags: defaultFeatureFlags(),
  toolRegistry: defaultToolRegistry(),
})
