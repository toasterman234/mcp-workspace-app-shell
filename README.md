# MCP Workspace (cross-host shell)

Generic **MCP Apps–friendly** workspace UI. It is **not** a single-purpose dashboard: it is a reusable shell with a **ResultBlock** pipeline (tables, series, KPIs, ranked lists, metric groups, events, filters, JSON), a **pattern registry** (page + adapter + catalog hints), and **plugin-style adapters** so new MCP tools can land via **MCPHub** without redesigning the front end.

## Implementation approach (references)

- **[assistant-ui/mcp-app-studio-starter](https://github.com/assistant-ui/mcp-app-studio-starter)** — Cross-host mindset: MCP-first, optional `window.openai` behind capability checks. This repo uses **Vite + React** (lighter than Next) but keeps the same separation: **host adapters**, **mock workbench**, **feature flags**, and a single shell.
- **[modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps) & MCP Apps docs** — Prefer standard MCP Apps fields and bridges; ChatGPT-only behavior stays in `src/hosts/adapters/chatgptBridge.ts` and feature flags.
- **[openai/openai-apps-sdk-examples](https://github.com/openai/openai-apps-sdk-examples)** — Conceptual reference for tool + UI composition (this project does not copy folder layout).
- **[openai/apps-sdk-ui](https://github.com/openai/apps-sdk-ui)** — Visual polish ideas only; styling here is self-contained CSS variables.
- **[pomerium/chatgpt-app-typescript-template](https://github.com/pomerium/chatgpt-app-typescript-template)** — Optional Node + widget deployment patterns; this app remains host-agnostic.

## Architecture

```
src/
  hosts/                 # 1) Host adapters — detection, capabilities, optional ChatGPT bridge
  mcp/                   # 2) MCP client + registry + normalizers
    registry/            #    pattern match → page (resolveToolPage)
    normalize/           #    raw structuredContent → NormalizedToolResult (legacy bridge)
  adapters/              # 3) Plugin-style adapters → ResultBlock[] (generic, portfolio, backtest, …)
  results/               #    ResultBlock union + fromNormalized bridge
  renderers/             # 4) GenericResultRenderer + leaf renderers (table, chart, ranked list, …)
  pages/                 # 5) Route-level views + Tool catalog
  fixtures/              # 6) Mock MCP payloads + mock tool catalog
  shell/                 # App chrome — nav, status, logs drawer
  state/                 # Zustand + localStorage persistence
```

### Data flow

1. **Settings** choose `mock` or `live` → `createMcpClient()` returns `MockMcpClient` or `McpHubClient`.
2. Pages call `useWorkspaceTool(toolName)` → registry resolves **adapterId** → `getAdapter()` → `McpClient.callTool()` with `readOnlyIntent: true`.
3. Adapter returns **ResultBlock[]** (often via `normalizeToolResult` + `resultBlocksFromNormalized`).
4. **GenericResultRenderer** displays blocks; unknown tools still render reasonably via **genericAdapter** heuristics.

### MCPHub role

- **MCPHub is the only tool endpoint** this UI talks to.
- MCPHub aggregates Tradier, Windmill, OpenBB, DuckDB, custom backtesters, etc. — those systems never appear in this codebase.
- When you add a server to MCPHub, update **tool registry** (Settings JSON) or rely on **genericAdapter** so new tools show up immediately.

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL (Vite default `http://localhost:5173`).

## ChatGPT App layer (new)

This repo now also includes a thin ChatGPT App MCP layer at `apps/chatgpt-app-server`.

It exists specifically for in-ChatGPT embedding and does **not** replace the standalone workspace.

- Standalone workspace: browser app → MCPHub
- ChatGPT surface: ChatGPT widget → app MCP layer → MCPHub

The app layer handles:

- curated tool registration
- widget template/resource registration
- read-only tool gating
- MCPHub proxy calls
- stable `structuredContent` contract (`workspace.v1`) for widget rendering

### Run the ChatGPT App layer locally

```bash
npm run app:server:install
npm run app:server:build-widget
npm run app:server:dev
```

See `apps/chatgpt-app-server/README.md` for env vars, mode toggles, and embedding TODOs.

### Current status (MCPHub + ChatGPT path)

- Discovery is live end-to-end in `APP_SERVER_MODE=live` (`/healthz` reports non-zero tool count).
- Invocation is live for multiple tools and providers.
- The app layer now preserves `content`-only MCP responses (not only `structuredContent`), surfaces upstream error detail, and exposes a debug endpoint when `MCP_DEBUG=1`.
- Transport/session/auth flow is handled in `apps/chatgpt-app-server/src/mcphubProxy.ts`:
  - initialize + notifications/initialized
  - `mcp-session-id` reuse
  - Streamable HTTP/SSE parsing with JSON-RPC id matching

### Commands

| Command        | Description            |
| -------------- | ---------------------- |
| `npm run dev`  | Vite dev server        |
| `npm run build`| Typecheck + production |
| `npm run preview` | Preview production build |

## Mock vs live

| Mode   | Client             | Behavior |
| ------ | ------------------ | -------- |
| `mock` | `MockMcpClient`    | Uses `src/fixtures/mockToolCatalog.ts` and payloads under `src/fixtures/payloads/`. |
| `live` | `McpHubClient`     | POSTs JSON-RPC `tools/list` / `tools/call` to `{mcphubBaseUrl}{mcphubMcpPath}`. |

Switch in **Settings → Data mode**.

Live mode behavior for the ChatGPT app layer is documented in `docs/APP_SHELL_MCPHUB_OPERATIONS.md`, including startup, smoke tests, and debugging.
Universal canvas migration plan is documented in `docs/UNIVERSAL_CANVAS_IMPLEMENTATION_PLAN.md`.

## Read-only default

- All page tools call with `readOnlyIntent: true`.
- `MockMcpClient` / `McpHubClient` reject `readOnlyIntent: false` unless you later wire explicit write flows (not enabled in v1 UI).

## Add a new tool / surface

1. **Fast path:** return JSON with common keys (`kpis`, `rows`/`columns`, `series`, `events`, `filters`, `metrics`, `groups` for metric sections) — **genericAdapter** slices them into **ResultBlock**s.
2. **Registry:** prepend a rule in **Settings → Tool registry** (or extend `src/config/defaultToolRegistry.ts`) with `pattern`, `page`, `category`, `adapterId`, `sampleRenderer`.
3. **Rich path:** add `src/adapters/yourAdapter.ts`, register it in `src/adapters/registry.ts`, extend `AdapterId` in `src/config/types.ts`, and point a registry rule at that adapter.

See **Tool catalog** (`/catalog`) for discovered tools × resolved registry metadata.

## Where downstream systems plug in

| System    | Integration point |
| --------- | ----------------- |
| MCPHub    | `McpHubClient` + Settings URL |
| Windmill  | MCP server registered in MCPHub |
| OpenBB    | MCP server in MCPHub |
| DuckDB    | MCP server in MCPHub |
| Tradier   | MCP server in MCPHub |
| Backtest engines | Tools exposed via MCPHub; optional `backtestAdapter` extensions |

## Assumptions (documented)

- MCPHub exposes an HTTP endpoint accepting JSON-RPC for `tools/list` and `tools/call` over Streamable HTTP.
- Tool results may surface as `structuredContent`, `content[]` text JSON, or both; the ChatGPT app layer handles all three patterns.
- **Host detection** is best-effort (`window.openai`, user agent); override via **Host mode** in Settings.

## Next steps (concrete)

1. Add an automated integration test suite that replays captured MCPHub responses for `tools/list` + `tools/call` edge cases (content-only, structured-only, mixed, error envelopes).
2. Add a **“Run tool”** debug panel in the standalone workspace mirroring `/debug/mcp-tool` behavior.
3. Improve adapter heuristics for generic table/chart extraction from text JSON payloads where no explicit view hints exist.
4. Wire CI checks that fail on opaque tool-call errors (empty message/raw output) in live-smoke mode.
5. Persist per-tool rendering hints from MCP `_meta` into registry rules to reduce manual adapter mapping.
