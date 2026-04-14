# Incident Template: MCP Tool Failure

Use this template when a tool works in discovery but fails at invocation.

## Incident metadata

- Date/time:
- Reporter:
- Environment:
  - app shell base URL:
  - mode (`mock`/`live`):
  - MCP debug enabled (`MCP_DEBUG`):
  - MCPHub base/path:

## Tool call

- Tool name:
- Arguments:
```json
{}
```

## Symptoms

- User-visible behavior:
- Was discovery healthy (`/healthz discoveredTools > 0`)?:
- Is failure consistent/reproducible?:

## Evidence

### 1) Health
```bash
curl -sS http://127.0.0.1:8787/healthz
```

Output:
```json
{}
```

### 2) Debug endpoint
```bash
curl -sS -X POST http://127.0.0.1:8787/debug/mcp-tool \
  -H "content-type: application/json" \
  -d '{"toolName":"<name>","arguments":{}}'
```

Output (trimmed):
```json
{
  "rpc": {},
  "parsedResult": {},
  "proxyCallResult": {},
  "mergeForWidget": {}
}
```

### 3) App logs (relevant lines)
Paste `mcphub-proxy` and `app-shell` log lines around the failed call.

## Diagnosis

- Transport/session/auth issue?:
- Upstream provider validation/data/backend issue?:
- Normalization/rendering issue?:
- Confidence level (low/medium/high):

## Resolution

- Fix applied:
- Files changed:
- Why this is provider-agnostic:

## Validation

- Re-run command(s):
- Success criteria met:
  - [ ] No opaque error (`raw: ""`, generic `"error"`)
  - [ ] Detailed upstream error surfaced when failing
  - [ ] Working tool path unaffected

## Follow-ups

- Add smoke test case?
- Add doc/changelog entry?
- Add regression test?

