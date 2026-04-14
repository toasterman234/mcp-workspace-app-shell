import type { McpClient } from './McpClient'
import type { ListToolsResult, ToolCallParams, ToolCallResult } from './types'
import type { JsonObject, JsonValue } from './types'

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string
  method: string
  params?: JsonObject
}

type JsonRpcResponse = {
  jsonrpc?: string
  id?: number | string
  result?: JsonValue
  error?: { code: number; message: string; data?: JsonValue }
}

/**
 * Live MCPHub bridge over HTTP JSON-RPC.
 *
 * TODO: MCPHub may use Streamable HTTP (SSE), session IDs, or auth headers —
 * adjust `postRpc` to match your hub's transport contract.
 * TODO: Add retries/backoff, cancellation (AbortSignal), and schema validation.
 */
export class McpHubClient implements McpClient {
  private nextId = 1
  private readonly baseUrl: string
  private readonly mcpPath: string
  private readonly fetchImpl: typeof fetch

  constructor(baseUrl: string, mcpPath: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = baseUrl
    this.mcpPath = mcpPath
    this.fetchImpl = fetchImpl
  }

  private endpoint(): string {
    const base = this.baseUrl.replace(/\/+$/, '')
    const path = this.mcpPath.startsWith('/') ? this.mcpPath : `/${this.mcpPath}`
    return `${base}${path}`
  }

  private async postRpc(method: string, params: JsonObject = {}): Promise<JsonRpcResponse> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method,
      params,
    }
    const res = await this.fetchImpl(this.endpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    if (!res.ok) {
      return { error: { code: res.status, message: text || res.statusText } }
    }
    try {
      return JSON.parse(text) as JsonRpcResponse
    } catch {
      return { error: { code: -32700, message: 'Invalid JSON from MCPHub' } }
    }
  }

  async listTools(): Promise<ListToolsResult> {
    const rpc = await this.postRpc('tools/list', {})
    if (rpc.error) {
      return { tools: [] }
    }
    const result = rpc.result as { tools?: ListToolsResult['tools'] } | undefined
    return { tools: result?.tools ?? [] }
  }

  async callTool(params: ToolCallParams): Promise<ToolCallResult> {
    if (params.readOnlyIntent === false) {
      return {
        isError: true,
        errorMessage: 'Write-capable tool calls are disabled (read-only default).',
      }
    }
    const rpc = await this.postRpc('tools/call', {
      name: params.name,
      arguments: params.arguments ?? {},
    })
    if (rpc.error) {
      return { isError: true, errorMessage: rpc.error.message }
    }
    // MCP tools/call result shape varies by SDK version — keep permissive.
    const result = rpc.result as {
      content?: ToolCallResult['content']
      structuredContent?: ToolCallResult['structuredContent']
      isError?: boolean
    }
    return {
      content: result?.content,
      structuredContent: result?.structuredContent,
      isError: Boolean(result?.isError),
    }
  }

  async ping(): Promise<{ ok: boolean; detail?: string }> {
    try {
      // MCP standard health check: tools/list (servers may not implement custom ping).
      const rpc = await this.postRpc('tools/list', {})
      if (rpc.error) return { ok: false, detail: rpc.error.message }
      return { ok: true, detail: 'live:tools/list' }
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'unknown error' }
    }
  }
}
