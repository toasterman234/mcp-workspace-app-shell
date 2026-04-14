# ChatGPT App MCP Layer (thin facade)

This package adds the missing **ChatGPT Apps / MCP App layer** in front of your existing MCPHub-backed workspace.

## Why this layer exists

Your standalone browser workspace already talks to MCPHub and renders generic `ResultBlock` output.
ChatGPT embedding needs an **MCP server that registers tools + UI resources** and returns widget-friendly `structuredContent`.

This server is that thin layer:

- registers a curated tool surface for ChatGPT
- registers a versioned widget template resource
- proxies tool calls to MCPHub (or local mock)
- normalizes responses to a stable `workspace.v1` contract
- keeps calls read-only by default

## Architecture

- **Surface A (existing):** browser workspace → MCPHub
- **Surface B (new):** ChatGPT widget → this app MCP server → MCPHub

Shared with standalone app:

- `ResultBlock` model
- adapters (`generic`, `portfolio`, `backtest`, `screener`, `etf`, `jobs`)
- registry defaults

Separated:

- ChatGPT tool/resource metadata
- host bridge (`ui/*` JSON-RPC + optional `window.openai`)
- MCP transport facade for ChatGPT

## Vertical slice (implemented)

Current slice is intentionally one ChatGPT-facing tool:

- `run_workspace_tool` (read-only by default)

Flow:

1. ChatGPT calls `run_workspace_tool` with `mode: "list"` to discover available tools
2. widget renders catalog and lets user/model pick a tool + args
3. ChatGPT/widget calls `run_workspace_tool` with `mode: "run"` and selected `toolName`
4. app server proxies to MCPHub (or mock mode fixture)
5. response is normalized via shared adapters into `ResultBlock[]`
6. app server returns stable `structuredContent` (`workspace.v1`)
7. widget receives `ui/notifications/tool-result` and renders shared generic renderer

### Expanding scope safely

Use allow/deny list env vars to control what the generic tool can execute:

- `WORKSPACE_TOOL_ALLOWLIST` (comma-separated, optional, supports prefix wildcard like `portfolio.*`)
- `WORKSPACE_TOOL_DENYLIST` (comma-separated, optional, supports prefix wildcard)
- `ALLOW_WRITE_THROUGH=false` (default) blocks suspicious write/execute tool names

## Local development

From this folder:

```bash
npm install
npm run build:widget
npm run dev
```

Server defaults:

- MCP endpoint (SSE): `GET /mcp`
- message endpoint: `POST /mcp/messages?sessionId=...`
- widget asset: `/assets/workspace-widget.js`
- health check: `/healthz`

### Modes

- `APP_SERVER_MODE=mock` (default): uses the repo mock dataset/tool catalog
- `APP_SERVER_MODE=live`: proxies to MCPHub

Live mode env:

- `MCPHUB_BASE_URL` (default `http://127.0.0.1:3005` — typical Docker host port mapping)
- `MCPHUB_MCP_PATH` (default `/mcp`)
- `MCPHUB_AUTH_HEADER` (optional bearer/token header value)
- `MCPHUB_TIMEOUT_MS` (default `20000`)
- `MCP_DEBUG` (`1`/`true` to enable verbose MCP proxy/app-shell debug logging and `/debug/mcp-tool`)

### Debug endpoint (when `MCP_DEBUG=1`)

`POST /debug/mcp-tool`

Request body:

```json
{
  "toolName": "tradier-get_market_quotes",
  "arguments": { "symbols": "AAPL" }
}
```

Response includes:

- raw RPC envelope from MCPHub (`rpc`)
- parsed tool result (`parsedResult`)
- normalized proxy result used by app shell (`proxyCallResult`)
- merged widget payload (`mergeForWidget`)

This endpoint is intentionally disabled unless:

- `APP_SERVER_MODE=live`
- `MCP_DEBUG=1`

## Auth scaffolding

`src/auth.ts` is intentionally thin in v1 and marks where OAuth/auth checks will plug in later:

- host token validation
- challenge flow via `_meta["mcp/www_authenticate"]`
- user/session mapping for private datasets

## Operational notes (current)

- `tools/list` and `tools/call` are sent to MCPHub with session reuse (`mcp-session-id`).
- Streamable HTTP/SSE responses are parsed by matching JSON-RPC `id` for more reliable multi-event tool calls.
- `content`-only tool responses are preserved and parsed (JSON text when present), not dropped.
- Upstream tool failures are propagated with detailed text where available (instead of opaque generic errors).

For full runbooks and troubleshooting, see:

- `../../docs/APP_SHELL_MCPHUB_OPERATIONS.md`
- `../../docs/APP_SHELL_MCPHUB_CHANGELOG.md`
- `../../docs/INCIDENT_TEMPLATE_MCP_TOOL_FAILURE.md`

## What is still TODO for full in-ChatGPT embedding

1. Register this MCP server URL in ChatGPT developer/connectors UI.
2. Host this server and widget asset on a publicly reachable HTTPS origin.
3. Tighten CSP domains for production.
4. Add OAuth and `_meta["mcp/www_authenticate"]` handling for private data.
5. Add automated integration coverage for mixed provider payload shapes and error envelopes.
6. Add integration tests against the exact ChatGPT-hosted bridge behavior.
