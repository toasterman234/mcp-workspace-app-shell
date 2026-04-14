import type { ListToolsResult, ToolCallParams, ToolCallResult } from './types'

/**
 * Single abstraction for all MCP access. Implementations:
 * - MockMcpClient: fixtures + simulated latency
 * - McpHubClient: HTTP JSON-RPC to MCPHub (see TODOs for transport nuances)
 */
export interface McpClient {
  listTools(): Promise<ListToolsResult>
  callTool(params: ToolCallParams): Promise<ToolCallResult>
  ping(): Promise<{ ok: boolean; detail?: string }>
}
