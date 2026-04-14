# Render Dual Deploy Runbook

This runbook deploys both:

- MCPHub (private Render service)
- ChatGPT app facade (`apps/chatgpt-app-server`) (public Render web service)

This avoids fragile local tunnel rotation and timeout loops.

## 1) Local runtime inventory (captured)

Current local MCPHub runtime characteristics:

- Container/image: `mcphub` / `samanhappy/mcphub:latest`
- Host port mapping: `3005 -> 3000`
- Entrypoint command: `pnpm start`
- Critical env vars:
  - `ADMIN_PASSWORD`
  - `JWT_SECRET`
- Persistent state:
  - `/app/data` (Docker volume)
  - `/app/mcp_settings.json` (bind-mounted config)
- Local compose dependency currently includes `market-lake` as internal DNS endpoint.

Reference files:

- [docker-compose.yml](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/Master Data Folder/market-lake/docker-compose.yml)
- [mcp_settings.stack.json](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/Master Data Folder/market-lake/deploy/mcp_settings.stack.json)

## 2) Render artifacts added

- Blueprint: [render.yaml](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/MCP Workspace:App:Shell/render.yaml)
- MCPHub image wrapper: [deploy/render/mcphub/Dockerfile](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/MCP Workspace:App:Shell/deploy/render/mcphub/Dockerfile)
- MCPHub config template: [deploy/render/mcphub/mcp_settings.render.json](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/MCP Workspace:App:Shell/deploy/render/mcphub/mcp_settings.render.json)

## 3) Required pre-deploy edits

No secrets should be written into repo files.
The MCPHub Docker image now renders `/app/mcp_settings.json` from template at container startup using env vars:

- `TRADIER_API_KEY`
- `MCPHUB_ADMIN_PASSWORD_BCRYPT`
- `MCPHUB_BEARER_TOKEN`

Template file remains committed with placeholders:
[deploy/render/mcphub/mcp_settings.render.json](/Volumes/Extra Storage Crucial 1TB SSD/Projects/Infrastructure/MCP Workspace:App:Shell/deploy/render/mcphub/mcp_settings.render.json)

Recommended:

- Keep only streamable-http MCP servers for Render unless you also deploy their runtime dependencies.
- Add back `market-lake` only if it is deployed to a reachable URL from Render.

## 4) Deploy with Render Blueprint

1. Push repo to GitHub (if not already).
2. In Render: **New** -> **Blueprint** -> connect repo.
3. Select `render.yaml`.
4. Configure secret env vars during creation:
   - `mcphub.ADMIN_PASSWORD`
   - `mcphub.JWT_SECRET`
   - `mcphub.TRADIER_API_KEY`
   - `mcphub.MCPHUB_ADMIN_PASSWORD_BCRYPT`
   - `mcphub.MCPHUB_BEARER_TOKEN`
   - `chatgpt-app-server.MCPHUB_AUTH_HEADER` as:
     - `Bearer <same token as mcphub.MCPHUB_BEARER_TOKEN>`

Notes:

- `chatgpt-app-server` is set to `plan: starter` in `render.yaml` to avoid free-tier sleep issues that cause connector timeouts.
- `APP_BASE_URL` is not required explicitly; app server now falls back to `RENDER_EXTERNAL_URL`.

## 5) Post-deploy checks

Assume:

- `APP_URL=https://<chatgpt-app-server>.onrender.com`

Run:

```bash
curl -sS "$APP_URL/healthz" | jq .
curl -sS -o /dev/null -w "%{http_code} %{content_type}\n" "$APP_URL/assets/workspace-widget.js"
```

Expected:

- `ok: true`
- `mode: live`
- `discoveredTools > 0`
- widget asset returns `200 text/javascript`

Optional debug check (`MCP_DEBUG=1`):

```bash
curl -sS -X POST "$APP_URL/debug/mcp-tool" \
  -H "content-type: application/json" \
  -d '{"toolName":"tradier-get_market_quotes","arguments":{"symbols":"AAPL"}}' | jq .
```

## 6) ChatGPT connector

Use this URL in ChatGPT connector:

`https://<chatgpt-app-server>.onrender.com/mcp`

Validation:

1. Connector creation succeeds without timeout
2. Widget loads
3. Run one real tool and confirm rendered output

## 7) Hardening

After successful validation:

1. Set `MCP_DEBUG=0`
2. Configure:
   - `WORKSPACE_TOOL_ALLOWLIST`
   - `WORKSPACE_TOOL_DENYLIST`
3. Rotate any placeholder/test secrets used during bring-up.
