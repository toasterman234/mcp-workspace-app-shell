import { createServer, type IncomingMessage } from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import type { JsonObject } from '../../../src/mcp/types.js'
import { asJsonObject } from '../../../src/lib/json.js'
import { mockToolCatalog, mockToolHandler } from '../../../src/fixtures/mockToolCatalog.js'
import { loadConfig } from './config.js'
import type { WidgetStructuredContent } from './contracts.js'
import { getCuratedSpec, CURATED_TOOLS } from './curatedTools.js'
import { McpHubProxy, type ProxyCallResult } from './mcphubProxy.js'
import { assertReadonlyTool, toWidgetStructuredContent } from './normalize.js'
import { WIDGET_RESOURCE_URI, buildWidgetHtml, widgetMeta } from './widgetTemplate.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ASSET_DIR = path.resolve(ROOT, 'assets')
const cfg = loadConfig()

const proxy = new McpHubProxy(cfg)

function debugLog(label: string, payload: unknown) {
  if (!cfg.mcpDebug) return
  const line =
    typeof payload === 'string'
      ? payload
      : JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? String(v) : v), 2)
  console.log(`[app-shell] ${label}\n${line}`)
}

/**
 * LAYER 1: ChatGPT-visible tool registration.
 * This is the curated public surface for the model.
 */
function buildTools(): Tool[] {
  return CURATED_TOOLS.map((t) => ({
    name: t.name,
    title: t.title,
    description: t.description,
    inputSchema: t.inputSchema as Tool['inputSchema'],
    _meta: widgetMeta(),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
      idempotentHint: true,
    },
  }))
}

/**
 * LAYER 2: UI resource registration.
 * Tool descriptors point to this template URI via standard ui.resourceUri metadata.
 */
function buildResources(): Resource[] {
  return [
    {
      uri: WIDGET_RESOURCE_URI,
      name: 'MCP Workspace widget template',
      description: 'Reusable generic ResultBlock renderer for curated MCP tools.',
      mimeType: 'text/html;profile=mcp-app',
      _meta: {
        ...widgetMeta(),
        'openai/widgetDescription': 'Reusable generic ResultBlock renderer for curated MCP tools.',
        'openai/widgetDomain': cfg.baseUrl,
        'openai/widgetCSP': {
          connect_domains: [cfg.baseUrl, cfg.mcphubBaseUrl],
          resource_domains: [cfg.baseUrl],
        },
        ui: {
          ...(widgetMeta().ui ?? {}),
          domain: cfg.baseUrl,
          csp: {
            connectDomains: [cfg.baseUrl, cfg.mcphubBaseUrl],
            resourceDomains: [cfg.baseUrl],
          },
        },
      },
    },
  ]
}

function buildResourceTemplates(): ResourceTemplate[] {
  return [
    {
      uriTemplate: WIDGET_RESOURCE_URI,
      name: 'MCP Workspace widget template',
      description: 'Reusable generic ResultBlock renderer for curated MCP tools.',
      mimeType: 'text/html;profile=mcp-app',
      _meta: widgetMeta(),
    },
  ]
}

/**
 * LAYER 3: backend access facade.
 * In mock mode we use local fixtures; in live mode we proxy to MCPHub only.
 */
async function callBackendTool(name: string, args: JsonObject = {}): Promise<ProxyCallResult> {
  if (cfg.mode === 'mock') return mockToolHandler(name, args)
  return proxy.callTool(name, args)
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return null
  return JSON.parse(raw) as unknown
}

/**
 * MCP tools/call often returns `content` (text/resource) without `structuredContent`.
 * The widget path must receive a non-empty object so adapters can render JSON / text.
 */
function mergeMcpResultForWidget(backend: ProxyCallResult): JsonObject {
  if (backend.isError) {
    return { _mcpError: backend.errorMessage ?? 'Tool call failed' }
  }
  const sc = asJsonObject(backend.structuredContent as unknown)
  const hasContent = Array.isArray(backend.content) && backend.content.length > 0
  if (sc && hasContent) return { ...sc, content: backend.content as unknown[] }
  if (sc) return sc
  if (hasContent) return { content: backend.content as unknown[] }
  return { _mcpEmptyResult: true }
}

function attachCanvasEnvelope<T extends WidgetStructuredContent>(doc: T): T {
  // Do not emit top-level `canvas` in app responses for now.
  // Some hosts may interpret it as a native canvas payload and bypass the app widget.
  // The widget can still derive canvas.v1 from workspace.v1 client-side.
  return doc
}

function firstTextContent(content: ProxyCallResult['content']): string | undefined {
  if (!Array.isArray(content)) return undefined
  for (const item of content) {
    if (item && item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
      return item.text
    }
  }
  return undefined
}

function wildcardMatch(name: string, rule: string): boolean {
  if (rule.endsWith('*')) return name.startsWith(rule.slice(0, -1))
  return name === rule
}

function isToolAllowedByPolicy(toolName: string): boolean {
  const denied = cfg.workspaceToolDenylist.some((rule) => wildcardMatch(toolName, rule))
  if (denied) return false
  if (cfg.workspaceToolAllowlist.length === 0) return true
  return cfg.workspaceToolAllowlist.some((rule) => wildcardMatch(toolName, rule))
}

async function listWorkspaceTools(): Promise<{
  tools: Array<{ name: string; description?: string; inputSchema?: JsonObject }>
  errorMessage?: string
}> {
  const discovered =
    cfg.mode === 'mock'
      ? {
          tools: mockToolCatalog().map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: asJsonObject(t.inputSchema) ?? undefined,
          })),
          errorMessage: undefined,
        }
      : await proxy.listToolsWithDiagnostics()

  const tools = discovered.tools
    .filter((t) => isToolAllowedByPolicy(t.name))
    .filter((t) => {
      if (cfg.allowWriteThrough) return true
      try {
        assertReadonlyTool(t.name, cfg.allowWriteThrough)
        return true
      } catch {
        return false
      }
    })
  return {
    tools,
    errorMessage: discovered.errorMessage,
  }
}

/**
 * LAYER 4 + 5: execution + normalization contract.
 *
 * Flow:
 * ChatGPT tool call (`open_scanner_results`)
 *   -> MCPHub call (`scanner.rank`)
 *   -> adapter normalization into ResultBlock[]
 *   -> stable widget contract (`workspace.v1`) in structuredContent
 */
async function runCuratedTool(requestedName: string, args: JsonObject = {}) {
  const spec = getCuratedSpec(requestedName)
  if (!spec) {
    return {
      isError: true,
      errorMessage: `Unknown curated tool: ${requestedName}`,
    }
  }

  const mode =
    typeof args.mode === 'string'
      ? args.mode
      : typeof args.toolName === 'string' && args.toolName.trim()
        ? 'run'
        : 'list'
  if (mode === 'list') {
    const listResult = await listWorkspaceTools()
    const tools = listResult.tools
    const structured = attachCanvasEnvelope({
      schemaVersion: 'workspace.v1',
      surface: 'chatgpt-widget',
      view: { id: 'catalog', title: spec.title, description: spec.description },
      requestedTool: requestedName,
      sourceTool: 'tools/list',
      blocks: [
        {
          id: 'workspace_tools_catalog',
          kind: 'json',
          title: 'Available tools',
          raw: { tools, errorMessage: listResult.errorMessage },
        },
      ],
      raw: { tools, errorMessage: listResult.errorMessage },
      catalog: { tools, errorMessage: listResult.errorMessage },
    })
    return {
      content: [
        {
          type: 'text',
          text:
            listResult.errorMessage && tools.length === 0
              ? `Workspace discovery warning: ${listResult.errorMessage}`
              : `Workspace is ready with ${tools.length} available tools.`,
        },
      ],
      structuredContent: structured,
      _meta: {
        ...widgetMeta(),
        mode: cfg.mode,
      },
    }
  }

  const sourceTool = typeof args.toolName === 'string' ? args.toolName : ''
  if (!sourceTool) return { isError: true, errorMessage: 'Missing required argument: toolName' }
  if (!isToolAllowedByPolicy(sourceTool)) {
    return { isError: true, errorMessage: `Tool "${sourceTool}" is blocked by workspace policy.` }
  }
  assertReadonlyTool(sourceTool, cfg.allowWriteThrough)

  const sourceArgs = asJsonObject(args.arguments) ?? {}

  const backend = await callBackendTool(sourceTool, sourceArgs)
  debugLog('run_workspace_tool backend', {
    requestedTool: requestedName,
    sourceTool,
    isError: backend.isError,
    errorMessage: backend.errorMessage,
    hasStructuredContent: backend.structuredContent != null,
    contentItems: Array.isArray(backend.content) ? backend.content.length : 0,
  })
  if (backend.isError) {
    const detail = backend.errorMessage ?? firstTextContent(backend.content) ?? 'Tool call failed.'
    const merged = mergeMcpResultForWidget(backend)
    debugLog('run_workspace_tool error normalized', {
      sourceTool,
      detailPreview: detail.slice(0, 500),
      merged,
    })
    const structured = attachCanvasEnvelope({
      schemaVersion: 'workspace.v1',
      surface: 'chatgpt-widget',
      view: { id: typeof args.viewId === 'string' ? args.viewId : sourceTool, title: spec.title },
      requestedTool: requestedName,
      sourceTool,
      blocks: [{ id: 'err_1', kind: 'json', title: 'Error', raw: { message: detail, backend: merged } }],
    })
    return {
      content: [{ type: 'text', text: detail }],
      structuredContent: structured,
      isError: true,
    }
  }

  const structured = attachCanvasEnvelope(
    toWidgetStructuredContent({
    requestedTool: requestedName,
    sourceTool,
    sourcePayload: mergeMcpResultForWidget(backend),
    viewId: typeof args.viewId === 'string' ? args.viewId : sourceTool.split('.')[0] ?? 'workspace',
    title: typeof args.title === 'string' ? args.title : sourceTool,
    description: spec.description,
    }),
  )
  debugLog('run_workspace_tool success normalized', {
    sourceTool,
    viewId: structured.view.id,
    blocks: structured.blocks.length,
    hasRaw: structured.raw != null,
  })
  return {
    content: [
      {
        type: 'text',
        text: `Rendered ${spec.title} from ${sourceTool}.`,
      },
    ],
    structuredContent: structured,
    _meta: {
      ...widgetMeta(),
      sourceTool,
      mode: cfg.mode,
    },
  }
}

function createMcpServer() {
  const server = new Server(
    { name: 'workspace-chatgpt-app-layer', version: '0.1.0' },
    { capabilities: { tools: {}, resources: {} } },
  )

  const tools = buildTools()
  const resources = buildResources()
  const templates = buildResourceTemplates()

  // Standard MCP requests used by ChatGPT Apps hosts.
  server.setRequestHandler(ListToolsRequestSchema, async (_req: ListToolsRequest) => ({ tools }))
  server.setRequestHandler(ListResourcesRequestSchema, async (_req: ListResourcesRequest) => ({ resources }))
  server.setRequestHandler(ListResourceTemplatesRequestSchema, async (_req: ListResourceTemplatesRequest) => ({
    resourceTemplates: templates,
  }))
  server.setRequestHandler(ReadResourceRequestSchema, async (req: ReadResourceRequest) => {
    if (req.params.uri !== WIDGET_RESOURCE_URI) {
      throw new Error(`Unknown resource URI: ${req.params.uri}`)
    }
    return {
      contents: [
        {
          uri: WIDGET_RESOURCE_URI,
          mimeType: 'text/html;profile=mcp-app',
          text: buildWidgetHtml(cfg.widgetJsPath),
          _meta: {
            ...widgetMeta(),
            ui: {
              ...(widgetMeta().ui ?? {}),
              domain: cfg.baseUrl,
              csp: {
                connectDomains: [cfg.baseUrl, cfg.mcphubBaseUrl],
                resourceDomains: [cfg.baseUrl],
              },
            },
          },
        },
      ],
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
    // Entry point for the vertical-slice tool.
    const name = req.params.name
    const args = (asJsonObject(req.params.arguments) ?? {}) as JsonObject
    return runCuratedTool(name, args)
  })
  return server
}

type SessionRecord = { server: Server; transport: SSEServerTransport }
const sessions = new Map<string, SessionRecord>()
const ssePath = '/mcp'
const postPath = '/mcp/messages'

async function handleSse(res: import('node:http').ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const server = createMcpServer()
  const transport = new SSEServerTransport(postPath, res)
  const sessionId = transport.sessionId
  sessions.set(sessionId, { server, transport })
  transport.onclose = async () => {
    sessions.delete(sessionId)
    await server.close()
  }
  await server.connect(transport)
  // Cloud tunnel/proxy stacks may buffer tiny SSE frames.
  // Emit a padding comment so clients receive immediate bytes and don't timeout during connector setup.
  try {
    res.write(`: ping ${' '.repeat(2048)}\n\n`)
  } catch {
    // ignore best-effort flush hints
  }
}

// Companion POST endpoint for SSE sessions.
async function handlePost(
  req: import('node:http').IncomingMessage,
  res: import('node:http').ServerResponse,
  url: URL,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  const sessionId = url.searchParams.get('sessionId')
  if (!sessionId) {
    res.writeHead(400).end('Missing sessionId')
    return
  }
  const session = sessions.get(sessionId)
  if (!session) {
    res.writeHead(404).end('Unknown session')
    return
  }
  await session.transport.handlePostMessage(req, res)
}

function serveStaticAsset(urlPath: string, res: import('node:http').ServerResponse): boolean {
  if (!urlPath.startsWith('/assets/')) return false
  const file = path.resolve(ROOT, `.${urlPath}`)
  if (!file.startsWith(ASSET_DIR)) {
    res.writeHead(403).end('Forbidden')
    return true
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404).end('Not found')
    return true
  }
  const ext = path.extname(file).toLowerCase()
  const type = ext === '.js' ? 'text/javascript' : 'application/octet-stream'
  res.writeHead(200, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store, max-age=0',
  })
  fs.createReadStream(file).pipe(res)
  return true
}

const httpServer = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400).end('Missing URL')
    return
  }
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)

  if (req.method === 'GET' && url.pathname === '/healthz') {
    // Helpful local dev check: mock count or MCPHub-discovered count.
    if (cfg.mode === 'mock') {
      const tools = mockToolCatalog().length
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
      res.end(JSON.stringify({ ok: true, mode: cfg.mode, discoveredTools: tools }))
      return
    }

    const discovery = await proxy.listToolsWithDiagnostics()
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    res.end(
      JSON.stringify({
        ok: true,
        mode: cfg.mode,
        discoveredTools: discovery.tools.length,
        mcphubBaseUrl: cfg.mcphubBaseUrl,
        mcphubMcpPath: cfg.mcphubMcpPath,
        mcphubAuthConfigured: Boolean(cfg.mcphubAuthHeader),
        discoveryError: discovery.errorMessage,
      }),
    )
    return
  }

  if (req.method === 'POST' && url.pathname === '/debug/mcp-tool') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    if (!cfg.mcpDebug) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
      return
    }
    if (cfg.mode !== 'live') {
      res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'debug endpoint requires APP_SERVER_MODE=live' }))
      return
    }
    try {
      const body = (await readJsonBody(req)) as Record<string, unknown> | null
      const toolName = typeof body?.toolName === 'string' ? body.toolName : typeof body?.name === 'string' ? body.name : ''
      if (!toolName) {
        res.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Missing toolName (or name) string in JSON body' }))
        return
      }
      const argumentsRaw = body.arguments ?? body.args
      const toolArgs = asJsonObject(argumentsRaw as unknown) ?? {}
      const raw = await proxy.callToolRaw(toolName, toolArgs)
      const normalized = await proxy.callTool(toolName, toolArgs)
      const merged = mergeMcpResultForWidget(normalized)
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(
        JSON.stringify(
          {
            toolName,
            arguments: toolArgs,
            mergeForWidget: merged,
            proxyCallResult: normalized,
            parsedResult: raw.result,
            rpc: raw.rpc,
          },
          null,
          2,
        ),
      )
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' }).end(
        JSON.stringify({ error: e instanceof Error ? e.message : 'debug handler failed' }),
      )
    }
    return
  }

  if (serveStaticAsset(url.pathname, res)) return

  if (
    req.method === 'OPTIONS' &&
    (url.pathname === ssePath || url.pathname === postPath)
  ) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type',
    })
    res.end()
    return
  }
  if (req.method === 'GET' && url.pathname === ssePath) {
    await handleSse(res)
    return
  }
  if (req.method === 'POST' && url.pathname === postPath) {
    await handlePost(req, res, url)
    return
  }

  res.writeHead(404).end('Not found')
})

httpServer.listen(cfg.port, () => {
  console.log(`[chatgpt-app-layer] mode=${cfg.mode} listening on ${cfg.baseUrl}`)
  console.log(`[chatgpt-app-layer] MCP SSE: ${cfg.baseUrl}${ssePath}`)
  console.log(`[chatgpt-app-layer] Assets: ${cfg.baseUrl}/assets/...`)
})
