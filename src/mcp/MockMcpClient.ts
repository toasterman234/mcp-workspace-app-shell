import type { McpClient } from './McpClient'
import type { ListToolsResult, ToolCallParams, ToolCallResult } from './types'
import { mockToolCatalog, mockToolHandler } from '../fixtures/mockToolCatalog'

/**
 * Deterministic mock MCP client — simulates MCPHub aggregation without network I/O.
 */
export class MockMcpClient implements McpClient {
  async listTools(): Promise<ListToolsResult> {
    return { tools: mockToolCatalog() }
  }

  async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    if (params.readOnlyIntent === false) {
      return {
        isError: true,
        errorMessage: 'Write-capable tool calls are disabled (read-only default).',
      }
    }
    await new Promise((r) => setTimeout(r, 120))
    return mockToolHandler(params.name, params.arguments)
  }

  async ping(): Promise<{ ok: boolean; detail?: string }> {
    return { ok: true, detail: 'mock' }
  }
}
