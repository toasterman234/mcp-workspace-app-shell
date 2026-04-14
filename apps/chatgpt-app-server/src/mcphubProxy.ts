import type { JsonObject, JsonValue, ToolCallResult } from '../../../src/mcp/types.js'
import { asJsonObject } from '../../../src/lib/json.js'
import type { AppServerConfig } from './config.js'

type RpcResponse = {
  jsonrpc?: string
  id?: number | string
  result?: JsonValue
  error?: { code?: number; message?: string }
}

const DEBUG_BODY_PREVIEW = 2048

function redactHeaders(h: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...h }
  if (out.Authorization) out.Authorization = '[redacted]'
  return out
}

function debugLog(cfg: AppServerConfig, label: string, payload: unknown) {
  if (!cfg.mcpDebug) return
  const line =
    typeof payload === 'string'
      ? payload
      : JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? String(v) : v), 2)
  console.log(`[mcphub-proxy] ${label}\n${line}`)
}

function firstTextContent(content: ToolCallResult['content']): string | undefined {
  if (!Array.isArray(content)) return undefined
  for (const item of content) {
    if (item && item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
      return item.text
    }
  }
  return undefined
}

/** Collect SSE `data:` payloads (one event may have multiple `data:` lines joined with `\n`). */
function collectSseDataPayloads(text: string): string[] {
  const payloads: string[] = []
  const buf: string[] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('data:')) {
      buf.push(line.slice('data:'.length).replace(/^\s/, ''))
      continue
    }
    if (line.trim() === '' && buf.length) {
      payloads.push(buf.join('\n'))
      buf.length = 0
    }
  }
  if (buf.length) payloads.push(buf.join('\n'))
  return payloads
}

function parseJsonRpcFromSsePayloads(payloads: string[], rpcId?: number): RpcResponse | undefined {
  const parsed: RpcResponse[] = []
  for (const p of payloads) {
    const t = p.trim()
    if (!t || t === '[DONE]') continue
    try {
      parsed.push(JSON.parse(t) as RpcResponse)
    } catch {
      // skip non-JSON noise
    }
  }
  if (rpcId !== undefined) {
    for (let i = parsed.length - 1; i >= 0; i--) {
      const o = parsed[i]
      if (o && o.id === rpcId) return o
    }
  }
  for (let i = parsed.length - 1; i >= 0; i--) {
    const o = parsed[i]
    if (o && (Object.prototype.hasOwnProperty.call(o, 'result') || Object.prototype.hasOwnProperty.call(o, 'error')))
      return o
  }
  return parsed.length ? parsed[parsed.length - 1] : undefined
}

/**
 * MCPHub may return JSON-RPC as plain JSON, or wrapped in SSE (possibly multiple events).
 * When `rpcId` is set, prefer the JSON-RPC object whose `id` matches the outbound request.
 */
function parseMcpHubHttpBody(text: string, rpcId?: number): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null

  const looksSse = trimmed.startsWith('event:') || /^data:/m.test(trimmed)
  if (looksSse) {
    const payloads = collectSseDataPayloads(trimmed)
    if (!payloads.length) {
      throw new Error('Unexpected SSE payload from MCPHub (missing data: lines)')
    }
    const picked = parseJsonRpcFromSsePayloads(payloads, rpcId)
    if (picked) return picked
    for (let i = payloads.length - 1; i >= 0; i--) {
      try {
        return JSON.parse(payloads[i].trim()) as unknown
      } catch {
        // keep scanning
      }
    }
    throw new Error('Unexpected SSE payload from MCPHub (data: lines were not JSON)')
  }

  return JSON.parse(trimmed) as unknown
}

export interface ProxyTool {
  name: string
  description?: string
  inputSchema?: JsonObject
}

/** Same shape as `ToolCallResult` — hub-backed tool responses. */
export type ProxyCallResult = ToolCallResult

export class McpHubProxy {
  private seq = 1
  private mcpSessionId?: string
  private sessionInitPromise?: Promise<void>

  constructor(private readonly cfg: AppServerConfig) {}

  private endpoint(): string {
    const base = this.cfg.mcphubBaseUrl.replace(/\/+$/, '')
    const path = this.cfg.mcphubMcpPath.startsWith('/') ? this.cfg.mcphubMcpPath : `/${this.cfg.mcphubMcpPath}`
    return `${base}${path}`
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.cfg.mcphubAuthHeader) headers.Authorization = this.cfg.mcphubAuthHeader
    return headers
  }

  private async ensureMcpSession(): Promise<void> {
    if (!this.cfg.mcphubAuthHeader) return
    if (this.mcpSessionId) return
    if (this.sessionInitPromise) return await this.sessionInitPromise

    this.sessionInitPromise = (async () => {
      const url = this.endpoint()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs)
      try {
        const initId = this.seq++
        const initBody = {
          jsonrpc: '2.0',
          id: initId,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'chatgpt-app-server', version: '0.1.0' },
          },
        }

        const initHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...this.authHeaders(),
        }
        debugLog(this.cfg, 'initialize request', {
          url,
          method: 'POST',
          headers: redactHeaders(initHeaders),
          body: initBody,
        })

        const initRes = await fetch(url, {
          method: 'POST',
          headers: initHeaders,
          body: JSON.stringify(initBody),
          signal: controller.signal,
        })

        const initText = await initRes.text()
        const sessionId = initRes.headers.get('mcp-session-id') ?? initRes.headers.get('Mcp-Session-Id')

        debugLog(this.cfg, 'initialize response meta', {
          status: initRes.status,
          contentType: initRes.headers.get('content-type'),
          mcpSessionId: sessionId,
          bodyPreview: initText.slice(0, DEBUG_BODY_PREVIEW),
        })

        if (!initRes.ok) {
          throw new Error(`MCPHub initialize failed (status=${initRes.status}): ${initText || initRes.statusText}`)
        }

        if (!sessionId) {
          throw new Error(`MCPHub initialize did not return mcp-session-id (status=${initRes.status}): ${initText || initRes.statusText}`)
        }

        try {
          const initParsed = parseMcpHubHttpBody(initText, initId) as RpcResponse
          debugLog(this.cfg, 'initialize parsed', initParsed)
          if (initParsed?.error) {
            throw new Error(initParsed.error.message ?? 'MCPHub initialize returned JSON-RPC error')
          }
        } catch (error) {
          throw new Error(
            `MCPHub initialize returned an unreadable payload (status=${initRes.status}): ${
              error instanceof Error ? error.message : 'parse error'
            }`,
          )
        }
        this.mcpSessionId = sessionId

        const notifHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId,
          ...this.authHeaders(),
        }
        const notifBody = { jsonrpc: '2.0', method: 'notifications/initialized' }
        debugLog(this.cfg, 'notifications/initialized request', {
          url,
          method: 'POST',
          headers: redactHeaders(notifHeaders),
          body: notifBody,
        })

        const notifRes = await fetch(url, {
          method: 'POST',
          headers: notifHeaders,
          body: JSON.stringify(notifBody),
          signal: controller.signal,
        })
        const notifText = await notifRes.text()
        debugLog(this.cfg, 'notifications/initialized response', {
          status: notifRes.status,
          contentType: notifRes.headers.get('content-type'),
          bodyPreview: notifText.slice(0, DEBUG_BODY_PREVIEW),
        })
        if (!notifRes.ok) {
          throw new Error(`MCPHub notifications/initialized failed (status=${notifRes.status}): ${notifText || notifRes.statusText}`)
        }
      } catch (error) {
        this.mcpSessionId = undefined
        throw error
      } finally {
        clearTimeout(timeout)
        this.sessionInitPromise = undefined
      }
    })()

    await this.sessionInitPromise
  }

  private async postRpc(method: string, params: JsonObject): Promise<RpcResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs)
    const rpcId = this.seq++
    const envelope = { jsonrpc: '2.0' as const, id: rpcId, method, params }
    try {
      try {
        await this.ensureMcpSession()
      } catch (error) {
        return { error: { code: -32000, message: error instanceof Error ? error.message : 'Failed to initialize MCP session' } }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...this.authHeaders(),
      }
      if (this.mcpSessionId) headers['mcp-session-id'] = this.mcpSessionId

      debugLog(this.cfg, `RPC request ${method}`, {
        url: this.endpoint(),
        method: 'POST',
        rpcId,
        mcpSessionId: this.mcpSessionId,
        headers: redactHeaders(headers),
        body: envelope,
      })

      const res = await fetch(this.endpoint(), {
        method: 'POST',
        headers,
        body: JSON.stringify(envelope),
        signal: controller.signal,
      })
      const txt = await res.text()

      debugLog(this.cfg, `RPC response ${method}`, {
        rpcId,
        status: res.status,
        contentType: res.headers.get('content-type'),
        mcpSessionId: res.headers.get('mcp-session-id') ?? res.headers.get('Mcp-Session-Id'),
        bodyPreview: txt.slice(0, DEBUG_BODY_PREVIEW),
      })

      if (!res.ok) {
        const msg = this.cfg.mcpDebug
          ? `HTTP ${res.status} from MCPHub (${this.endpoint()}): ${txt.slice(0, DEBUG_BODY_PREVIEW) || res.statusText}`
          : txt || res.statusText
        return { error: { code: res.status, message: msg } }
      }
      if (!txt.trim()) {
        return {}
      }
      try {
        const parsed = parseMcpHubHttpBody(txt, rpcId) as RpcResponse
        debugLog(this.cfg, `RPC parsed ${method}`, parsed)

        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const o = parsed as Record<string, unknown>
          if (typeof o.error === 'string') {
            const desc = typeof o.error_description === 'string' ? `: ${o.error_description}` : ''
            return { error: { code: -32001, message: `MCPHub auth error (${o.error}${desc})` } }
          }
        }
        return parsed
      } catch (e) {
        const hint = this.cfg.mcpDebug
          ? `Invalid JSON/SSE from MCPHub (rpcId=${rpcId}): ${e instanceof Error ? e.message : 'parse error'}; bodyPreview=${JSON.stringify(
              txt.slice(0, DEBUG_BODY_PREVIEW),
            )}`
          : 'Invalid JSON response from MCPHub'
        return { error: { code: -32700, message: hint } }
      }
    } catch (error) {
      return { error: { code: -32000, message: error instanceof Error ? error.message : 'Request failed' } }
    } finally {
      clearTimeout(timeout)
    }
  }

  async listTools(): Promise<ProxyTool[]> {
    const { tools } = await this.listToolsWithDiagnostics()
    return tools
  }

  async listToolsWithDiagnostics(): Promise<{ tools: ProxyTool[]; errorMessage?: string }> {
    const rpc = await this.postRpc('tools/list', {})
    if (rpc.error) {
      return {
        tools: [],
        errorMessage: `Failed to discover tools from MCPHub (${this.endpoint()}): ${rpc.error.message ?? 'Unknown error'}`,
      }
    }
    const obj = asJsonObject(rpc.result)
    const toolsRaw = Array.isArray(obj?.tools) ? obj.tools : []
    const tools: ProxyTool[] = []
    for (const t of toolsRaw) {
      const o = asJsonObject(t)
      if (!o?.name || typeof o.name !== 'string') continue
      tools.push({
        name: o.name,
        description: typeof o.description === 'string' ? o.description : undefined,
        inputSchema: asJsonObject(o.inputSchema) ?? undefined,
      })
    }
    if (!tools.length) {
      return {
        tools,
        errorMessage:
          'MCPHub responded to tools/list but returned zero tools. Verify mounted tool providers and MCPHub configuration.',
      }
    }
    return { tools }
  }

  async callTool(name: string, args: JsonObject = {}): Promise<ProxyCallResult> {
    const rpc = await this.postRpc('tools/call', { name, arguments: args })
    if (rpc.error) {
      return {
        isError: true,
        errorMessage: rpc.error.message ?? 'MCPHub call failed',
      }
    }
    const result = asJsonObject(rpc.result)
    if (!result) {
      return {
        isError: true,
        errorMessage: this.cfg.mcpDebug
          ? `Invalid tools/call result from MCPHub: missing result (rpc raw=${JSON.stringify(rpc).slice(0, DEBUG_BODY_PREVIEW)})`
          : 'Invalid tools/call result from MCPHub',
      }
    }
    const content = Array.isArray(result.content) ? (result.content as ProxyCallResult['content']) : undefined
    let structuredContent = result.structuredContent as JsonValue | undefined
    const isError = Boolean(result.isError)
    let errorMessage = typeof result.errorMessage === 'string' ? result.errorMessage : undefined

    // Many MCP tools return JSON in a text content block (with no structuredContent).
    if (!structuredContent) {
      const text = firstTextContent(content)
      if (text) {
        try {
          structuredContent = JSON.parse(text) as JsonValue
        } catch {
          // Keep text-only content path.
        }
      }
    }

    // Some providers set isError=true but only place details in content[0].text.
    if (isError && !errorMessage) {
      const text = firstTextContent(content)
      if (text) errorMessage = text
    }

    const out: ProxyCallResult = {
      structuredContent,
      content,
      isError,
      errorMessage,
    }
    debugLog(this.cfg, `RPC normalized tools/call ${name}`, {
      isError: out.isError,
      errorMessage: out.errorMessage,
      hasStructuredContent: out.structuredContent != null,
      contentItems: Array.isArray(out.content) ? out.content.length : 0,
    })
    return out
  }

  /**
   * Full upstream-shaped result for debug/smoke tests (includes content + structuredContent + flags).
   */
  async callToolRaw(name: string, args: JsonObject = {}): Promise<{ rpc: RpcResponse; result: JsonObject | null }> {
    const rpc = await this.postRpc('tools/call', { name, arguments: args })
    return { rpc, result: asJsonObject(rpc.result) }
  }
}
