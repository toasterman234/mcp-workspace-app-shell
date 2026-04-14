# App Shell + MCPHub Integration Changelog

Track behavior-level integration changes here (not product features).  
Focus: transport, parsing, normalization, error propagation, and operability.

## 2026-04-14

### Added
- MCP proxy debug mode via `MCP_DEBUG=1`.
- `/debug/mcp-tool` endpoint in app shell (live+debug only) returning:
  - raw RPC envelope
  - parsed result
  - normalized proxy result
  - merged widget payload
- Operations runbook: `docs/APP_SHELL_MCPHUB_OPERATIONS.md`.
- Smoke script: `npm run app:server:smoke`.
- Incident template: `docs/INCIDENT_TEMPLATE_MCP_TOOL_FAILURE.md`.

### Fixed
- `notifications/initialized` now always uses explicit `POST` (avoids GET-with-body failures).
- Streamable HTTP/SSE parsing now matches JSON-RPC response by `id` for robust multi-event parsing.
- `tools/call` now supports content-only results:
  - attempts JSON parse from `content[0].text` into `structuredContent`.
- Error propagation hardened:
  - when `isError=true` and no `errorMessage`, derive from `content` text.
  - avoids opaque errors (`raw: ""`, generic `"error"`).

### Changed
- Default registry mapping for `tradier.*` switched to `generic` adapter to avoid scan-only assumptions.

### Known limitations
- Some provider calls may still fail due to upstream data/configuration (for example missing data files).  
  These should now surface as detailed upstream errors rather than app-shell opaque failures.

