#!/usr/bin/env node

/**
 * App shell + MCPHub smoke test.
 *
 * Purpose:
 * - verify app shell health and discovery count
 * - exercise /debug/mcp-tool for a representative tool sample
 * - ensure failures are detailed (not opaque)
 *
 * Usage:
 *   node scripts/app-shell-smoke.mjs
 *
 * Optional env:
 *   APP_SHELL_BASE_URL=http://127.0.0.1:8787
 *   APP_SHELL_SMOKE_CASES_JSON='[{"toolName":"foo","arguments":{}}]'
 *   APP_SHELL_SMOKE_REQUIRE_DEBUG=1   (default: 1)
 */

const BASE_URL = process.env.APP_SHELL_BASE_URL ?? 'http://127.0.0.1:8787';
const REQUIRE_DEBUG = (process.env.APP_SHELL_SMOKE_REQUIRE_DEBUG ?? '1') !== '0';

const defaultCases = [
  { toolName: 'tradier-get_user_profile', arguments: {} },
  { toolName: 'tradier-get_market_quotes', arguments: { symbols: 'AAPL' } },
  { toolName: 'market-lake-get_manifest', arguments: {} },
  { toolName: 'tradier-get_options_chain', arguments: { symbol: 'AAPL', expiration: '2026-04-17' } },
];

function parseCases() {
  const raw = process.env.APP_SHELL_SMOKE_CASES_JSON;
  if (!raw) return defaultCases;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('APP_SHELL_SMOKE_CASES_JSON must be a JSON array');
    return parsed;
  } catch (err) {
    throw new Error(
      `Invalid APP_SHELL_SMOKE_CASES_JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function firstTextContent(content) {
  if (!Array.isArray(content)) return '';
  for (const item of content) {
    if (item && item.type === 'text' && typeof item.text === 'string' && item.text.trim()) {
      return item.text;
    }
  }
  return '';
}

function isOpaqueFailure(proxyCallResult) {
  if (!proxyCallResult || !proxyCallResult.isError) return false;
  const msg = typeof proxyCallResult.errorMessage === 'string' ? proxyCallResult.errorMessage.trim() : '';
  const text = firstTextContent(proxyCallResult.content).trim();
  const bad =
    msg === '' ||
    msg.toLowerCase() === 'error' ||
    msg.toLowerCase() === 'tool call failed.' ||
    msg.toLowerCase() === 'tool call failed';
  return bad && text === '';
}

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${text.slice(0, 500)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`GET ${url} did not return JSON`);
  }
}

async function postDebug(toolName, args) {
  const res = await fetch(`${BASE_URL}/debug/mcp-tool`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ toolName, arguments: args ?? {} }),
  });
  const text = await res.text();
  if (res.status === 404 && REQUIRE_DEBUG) {
    throw new Error(
      '/debug/mcp-tool returned 404. Start app server with APP_SERVER_MODE=live and MCP_DEBUG=1.',
    );
  }
  if (!res.ok) {
    throw new Error(`POST /debug/mcp-tool failed for ${toolName}: ${res.status} ${text.slice(0, 600)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`POST /debug/mcp-tool for ${toolName} did not return JSON`);
  }
}

async function main() {
  const health = await getJson(`${BASE_URL}/healthz`);
  if (!health.ok) throw new Error('Health check returned ok=false');
  if (!Number.isFinite(health.discoveredTools) || health.discoveredTools <= 0) {
    throw new Error(`Discovery count invalid: ${health.discoveredTools}`);
  }

  const cases = parseCases();
  const results = [];
  for (const c of cases) {
    const out = await postDebug(c.toolName, c.arguments ?? {});
    const proxy = out.proxyCallResult ?? {};
    const text = firstTextContent(proxy.content).slice(0, 220);
    results.push({
      toolName: c.toolName,
      isError: !!proxy.isError,
      hasStructuredContent: proxy.structuredContent != null,
      contentItems: Array.isArray(proxy.content) ? proxy.content.length : 0,
      errorMessagePreview:
        typeof proxy.errorMessage === 'string' ? proxy.errorMessage.slice(0, 220) : undefined,
      firstTextPreview: text || undefined,
      opaqueFailure: isOpaqueFailure(proxy),
    });
  }

  const successCount = results.filter((r) => r.isError === false).length;
  const opaqueCount = results.filter((r) => r.opaqueFailure).length;

  const summary = {
    baseUrl: BASE_URL,
    discoveredTools: health.discoveredTools,
    sampled: results.length,
    successCount,
    opaqueCount,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (opaqueCount > 0) {
    throw new Error(`Found ${opaqueCount} opaque failure(s); expected detailed upstream errors.`);
  }
  if (successCount === 0) {
    throw new Error('No successful calls in sample set; verify credentials/provider health.');
  }
}

main().catch((err) => {
  console.error(`[app-shell-smoke] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

