import type { AppSettings } from '../config/types'
import type { McpClient } from './McpClient'
import { MockMcpClient } from './MockMcpClient'
import { McpHubClient } from './McpHubClient'

export function createMcpClient(settings: AppSettings): McpClient {
  if (settings.dataMode === 'mock') {
    return new MockMcpClient()
  }
  return new McpHubClient(settings.mcphubBaseUrl, settings.mcphubMcpPath)
}
