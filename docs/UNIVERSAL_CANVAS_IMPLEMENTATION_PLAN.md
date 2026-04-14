# Universal Canvas + Unified MCP Layer Plan

This plan describes how to evolve the current app shell into a host-agnostic
"universal canvas" that works in ChatGPT and the standalone workspace while
keeping MCP transport/tooling unified and provider-agnostic.

## Why this plan

Current system is solid on transport and error visibility, but presentation is still
adapter-heavy (`ResultBlock` heuristics + per-domain adapters).

Goal: make new tools render quickly and consistently without provider-specific UI code.

## Inputs from research

1. **Apps SDK / MCP Apps bridge**
   - Tool results flow through `ui/notifications/tool-result` and include
     `structuredContent`, `content`, and `_meta`.
   - `structuredContent` and `content` are model-visible; `_meta` is widget-only.
   - Tool call from widget is standard (`tools/call`), so UI can be host-portable.

2. **MCP transport**
   - Streamable HTTP is the modern recommended transport.
   - Session and SSE compatibility remain practical requirements.

3. **Visualization tech options**
   - Declarative grammar (Vega-Lite) is strong for host-agnostic chart contracts.
   - ECharts is strong renderer-wise but public option-schema validation is weaker.
   - Security/operability concerns for untrusted specs mean strict validation and
     constrained rendering are required regardless of library choice.

## Recommendation

Adopt a **hybrid universal canvas contract**:

- `canvas.v1` top-level envelope
- mixed block model:
  - grammar block for charts (`vega_lite`)
  - typed blocks for tables/KPIs/events/filters/json
- strict schema validation + size limits before rendering

This keeps charts declarative and flexible while preserving robust typed rendering
for common non-chart outputs.

## Target architecture

### Layer 1: Unified MCP gateway (already mostly in place)

`apps/chatgpt-app-server/src/mcphubProxy.ts`

- session bootstrap/reuse
- auth header forwarding
- tools/list and tools/call forwarding
- robust Streamable HTTP parsing
- upstream error propagation

No provider-specific branching.

### Layer 2: Universal presentation contract

Introduce `canvas.v1`:

```json
{
  "schemaVersion": "canvas.v1",
  "view": { "id": "overview", "title": "Tool Result" },
  "blocks": [
    { "id": "b1", "kind": "vega_lite", "spec": {} },
    { "id": "b2", "kind": "table", "table": {} },
    { "id": "b3", "kind": "json", "raw": {} }
  ],
  "errors": []
}
```

### Layer 3: Renderers

- ChatGPT widget renderer and standalone renderer consume same `canvas.v1`.
- Existing `workspace.v1` supported via compatibility mapper:
  - `workspace.v1 -> canvas.v1`

### Layer 4: Compatibility adapters

Adapters remain, but become **producers of `canvas.v1`** (or blocks in that shape),
not bespoke page logic.

## Data contract rules

1. Prefer concise model-facing fields in `structuredContent`.
2. Put large hydration-only maps in `_meta`.
3. Always include a fallback `json` block when typed/chart extraction fails.
4. Never return opaque error text; include upstream detail previews.
5. Validate all `vega_lite` specs against an allowlist profile before render.

## Implementation phases

## Phase 0 - Baseline and guardrails

- Freeze current behavior with snapshot fixtures:
  - working success: `tradier-get_user_profile`, `tradier-get_market_quotes`
  - known upstream failure: `market-lake-get_manifest`
- Keep smoke checks (`npm run app:server:smoke`) as required gate.

Deliverables:
- fixture captures for `rpc`, `parsedResult`, `proxyCallResult`, `mergeForWidget`

## Phase 1 - Introduce `canvas.v1` types and validator

Add:
- `src/canvas/types.ts`
- `src/canvas/schema.ts` (zod/json-schema)

Support block kinds:
- `vega_lite`, `table`, `kpis`, `metricGroups`, `rankedList`, `events`, `filters`, `json`

Deliverables:
- schema validation utility
- unit tests for valid/invalid payloads

## Phase 2 - Compatibility mapper (`workspace.v1` -> `canvas.v1`)

Add:
- `apps/chatgpt-app-server/src/canvas/compat.ts`
- `src/canvas/compat.ts` (shared mapper if possible)

Deliverables:
- pure mapping function
- fixtures + snapshot tests

## Phase 3 - Universal renderer in both surfaces

Add:
- `src/renderers/CanvasRenderer.tsx`
- widget equivalent renderer using same block semantics

Keep old `GenericResultRenderer` as fallback during transition.

Deliverables:
- renderer parity tests
- visual snapshot tests (or deterministic DOM tests)

## Phase 4 - Chart grammar block (`vega_lite`)

Add chart block rendering with strict constraints:
- disallow remote URL data by default
- enforce max row counts
- enforce spec depth/size limits
- disable unsupported actions

Deliverables:
- spec validation tests
- malicious/untrusted spec rejection tests

Status:
- Implemented baseline guarded renderer (`VegaLiteRenderer`) and policy checks in `src/canvas/vegaLitePolicy.ts`:
  - blocks URL-backed data sources
  - caps spec size/depth/node complexity
  - falls back to explicit error + JSON spec viewer on rejection/render error

## Phase 5 - Producer migration

Update adapters/normalizers so outputs are first-class `canvas.v1`:
- generic adapter
- screener/portfolio/backtest adapters

No provider-specific branching.

Deliverables:
- old/new output parity tests
- no regression in smoke suite

## Phase 6 - Cutover + deprecation

- Default to canvas rendering path
- Keep `workspace.v1` compatibility bridge for a defined period
- announce deprecation window in changelog

## Testing strategy

## A) Contract tests (unit)

- `canvas.v1` schema validation
- workspace-to-canvas compatibility mapper
- error envelope normalization (no opaque failures)

## B) Integration tests (transport + normalization)

Against running app shell (`MCP_DEBUG=1`):
- `/healthz` discovery assertions
- `/debug/mcp-tool` assertions on:
  - successful calls produce typed blocks/structured output
  - failing calls include detailed upstream error content

## C) End-to-end host tests

1. ChatGPT path:
   - verify tool result renders from same canvas blocks
2. Standalone app path:
   - same tool payload renders equivalently

## D) Regression gates (CI)

Required pass:
- `npm run app:server:smoke`
- new `canvas` contract unit tests
- no opaque error snapshots

## Acceptance criteria

1. New MCP tool with structured JSON can render without new provider-specific UI code.
2. Existing known-good tools continue to render correctly in both surfaces.
3. Known failures show detailed upstream diagnostics (status/body preview), never opaque placeholders.
4. ChatGPT and standalone app consume same contract (`canvas.v1`) for visuals.
5. Transport remains provider-agnostic.

## Risks and mitigations

- **Risk:** chart grammar introduces unsafe/unbounded specs  
  **Mitigation:** strict validation, no remote data URLs, hard payload limits.

- **Risk:** host-specific bridge quirks with structured content  
  **Mitigation:** dual-path fallback (`content` + `structuredContent`) and debug endpoint snapshots.

- **Risk:** migration regression in old blocks  
  **Mitigation:** compatibility mapper + snapshot tests + staged cutover.

## Suggested first implementation slice (1-2 days)

1. Add `canvas.v1` types + validator + tests.
2. Add mapper from existing `workspace.v1` to `canvas.v1`.
3. Add `CanvasRenderer` that supports current block kinds (no Vega yet).
4. Wire ChatGPT widget and standalone app to use mapper + new renderer.
5. Keep smoke test green before adding chart grammar.

Initial contract checks can be run with:

```bash
npm run canvas:test
```

