# App Shell + MCPHub Operations Guide

This document is the handoff/runbook for operating and debugging the ChatGPT App Shell integration with MCPHub.

## Scope

- App shell server: `apps/chatgpt-app-server`
- MCPHub backend: local Docker service on `http://127.0.0.1:3005`
- Public ChatGPT-facing endpoint: `https://apically-crutchlike-marketta.ngrok-free.dev/mcp`

## Architecture

1. ChatGPT connects to app shell MCP endpoints:
   - `GET /mcp` (SSE handshake)
   - `POST /mcp/messages?sessionId=...`
2. App shell registers curated tool `run_workspace_tool`.
3. In `mode=run`, app shell proxies to MCPHub:
   - `tools/call` with JSON-RPC
   - session initialization + reuse (`mcp-session-id`)
4. Tool result is normalized into `workspace.v1` widget blocks.

## Critical behavior (current)

- Discovery and invocation both run through MCPHub in `APP_SERVER_MODE=live`.
- Streamable HTTP/SSE parsing in `mcphubProxy.ts` matches JSON-RPC by `id`.
- Content-only responses are supported:
  - JSON text in `content[0].text` is parsed into structured content when possible.
- Errors are not flattened:
  - if upstream sets `isError=true` but omits `errorMessage`, app shell derives message from text content.
- Debug endpoint (`/debug/mcp-tool`) is available only with `MCP_DEBUG=1`.

## Environment variables

Required for live mode:

- `APP_SERVER_MODE=live`
- `APP_BASE_URL=https://apically-crutchlike-marketta.ngrok-free.dev`
- `MCPHUB_BASE_URL=http://127.0.0.1:3005`
- `MCPHUB_MCP_PATH=/mcp`
- `MCPHUB_AUTH_HEADER=Bearer <raw-key>`

Optional:

- `MCP_DEBUG=1` enables verbose proxy logging and `/debug/mcp-tool`.
- `MCPHUB_TIMEOUT_MS=20000` default request timeout.
- `WORKSPACE_TOOL_ALLOWLIST` and `WORKSPACE_TOOL_DENYLIST` for policy control.

## Startup runbook

From repo root:

```bash
npm run app:server:install
npm run app:server:build-widget
```

Start ngrok (if not already running) for port `8787`.

Start app server in live mode (with valid `MCPHUB_AUTH_HEADER`):

```bash
APP_BASE_URL="https://apically-crutchlike-marketta.ngrok-free.dev" \
APP_SERVER_MODE=live \
MCPHUB_BASE_URL="http://127.0.0.1:3005" \
MCPHUB_MCP_PATH="/mcp" \
MCPHUB_AUTH_HEADER="Bearer <raw-key>" \
MCP_DEBUG=1 \
npm run app:server:start
```

## Quick health checks

```bash
curl -sS http://127.0.0.1:8787/healthz
curl -sS https://apically-crutchlike-marketta.ngrok-free.dev/healthz
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/assets/workspace-widget.js
```

Expected:

- `discoveredTools` > 0
- `mcphubAuthConfigured: true`
- widget asset returns `200`

## Differential smoke tests

Use these tool calls to compare known-good and known-failing behavior:

```bash
curl -sS -X POST http://127.0.0.1:8787/debug/mcp-tool \
  -H "content-type: application/json" \
  -d '{"toolName":"tradier-get_user_profile","arguments":{}}' | jq .

curl -sS -X POST http://127.0.0.1:8787/debug/mcp-tool \
  -H "content-type: application/json" \
  -d '{"toolName":"tradier-get_market_quotes","arguments":{"symbols":"AAPL"}}' | jq .

curl -sS -X POST http://127.0.0.1:8787/debug/mcp-tool \
  -H "content-type: application/json" \
  -d '{"toolName":"market-lake-get_manifest","arguments":{}}' | jq .

curl -sS -X POST http://127.0.0.1:8787/debug/mcp-tool \
  -H "content-type: application/json" \
  -d '{"toolName":"tradier-get_options_chain","arguments":{"symbol":"AAPL","expiration":"2026-04-17"}}' | jq .
```

Inspect:

- `rpc` (raw RPC envelope)
- `parsedResult` (post-parse tool result)
- `proxyCallResult` (normalized app-shell result)
- `mergeForWidget` (final payload given to widget normalization)

### Automated smoke script

From repo root:

```bash
npm run app:server:smoke
```

Defaults:

- base URL: `http://127.0.0.1:8787`
- sample calls: profile/quotes/options-chain + market-lake manifest
- requires debug endpoint (`MCP_DEBUG=1`) unless `APP_SHELL_SMOKE_REQUIRE_DEBUG=0`

Optional overrides:

- `APP_SHELL_BASE_URL`
- `APP_SHELL_SMOKE_CASES_JSON`
- `APP_SHELL_SMOKE_REQUIRE_DEBUG`

## Known non-shell issue

`market-lake-get_manifest` can fail with a real upstream 500 (example):

- missing parquet pattern under `.../market-lake/.../fact_dataset_manifest/**/*.parquet`

This is a provider/data issue, not a shell transport issue, and should surface as detailed text.

## Troubleshooting matrix

- `discoveredTools = 0`, auth false:
  - missing/expired `MCPHUB_AUTH_HEADER`
- `discoveredTools = 0`, auth true:
  - MCPHub unavailable, wrong base URL/path, or session/bootstrap failure
- tool call returns opaque/generic message:
  - should be considered regression; verify `MCP_DEBUG=1`, inspect `rpc` + `parsedResult`
- SSE/transport weirdness:
  - verify app logs for request/response previews and matched RPC ids

## Guidance for next LLM/operator

When debugging new tool failures:

1. Start with `/debug/mcp-tool` using exact tool + args.
2. Compare:
   - upstream `rpc.result`
   - derived `proxyCallResult`
   - `mergeForWidget`
3. Decide if issue is:
   - transport/parsing/session/auth (shell)
   - provider validation/data/backend error (upstream)
4. Do not add provider-specific hacks to proxy path.
5. Keep fixes generic in:
   - `mcphubProxy.ts` (transport/parsing/error extraction)
   - `server.ts` (merge/normalization and error visibility)
6. Record incidents with `docs/INCIDENT_TEMPLATE_MCP_TOOL_FAILURE.md`.
7. Add integration-level notes to `docs/APP_SHELL_MCPHUB_CHANGELOG.md` for future handoffs.

