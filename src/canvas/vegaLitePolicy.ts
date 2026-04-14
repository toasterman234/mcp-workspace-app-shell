export interface VegaLiteValidationResult {
  ok: boolean
  reasons: string[]
}

const MAX_SPEC_BYTES = 100_000
const MAX_DEPTH = 20
const MAX_TOTAL_NODES = 20_000
const MAX_ARRAY_ITEMS = 5_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUrlLike(value: string): boolean {
  const v = value.trim().toLowerCase()
  return (
    v.startsWith('http:') ||
    v.startsWith('https:') ||
    v.startsWith('data:') ||
    v.startsWith('file:') ||
    v.startsWith('ftp:') ||
    v.startsWith('ws:') ||
    v.startsWith('wss:') ||
    v.startsWith('//')
  )
}

export function validateVegaLiteSpec(spec: unknown): VegaLiteValidationResult {
  const reasons: string[] = []
  if (!isRecord(spec)) {
    return { ok: false, reasons: ['spec must be an object'] }
  }

  const encoded = JSON.stringify(spec)
  if (encoded.length > MAX_SPEC_BYTES) {
    reasons.push(`spec is too large (${encoded.length} bytes > ${MAX_SPEC_BYTES})`)
  }

  const schema = typeof spec.$schema === 'string' ? spec.$schema.toLowerCase() : ''
  if (schema && !schema.includes('vega-lite')) {
    reasons.push('spec.$schema must reference vega-lite')
  }

  let totalNodes = 0
  const walk = (value: unknown, depth: number, path: string[]) => {
    totalNodes++
    if (totalNodes > MAX_TOTAL_NODES) {
      reasons.push(`spec is too complex (node count > ${MAX_TOTAL_NODES})`)
      return
    }
    if (depth > MAX_DEPTH) {
      reasons.push(`spec exceeds max depth (${MAX_DEPTH})`)
      return
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) {
        reasons.push(`array at ${path.join('.')} exceeds max items (${MAX_ARRAY_ITEMS})`)
      }
      for (let i = 0; i < value.length; i++) walk(value[i], depth + 1, [...path, String(i)])
      return
    }
    if (!isRecord(value)) return

    for (const [k, v] of Object.entries(value)) {
      // Universal rule: disallow URL-backed fetch paths in specs.
      if (k === 'url' && typeof v === 'string' && isUrlLike(v)) {
        reasons.push(`remote/URL data source is not allowed (path: ${[...path, k].join('.')})`)
      }
      walk(v, depth + 1, [...path, k])
    }
  }

  walk(spec, 0, ['spec'])
  return { ok: reasons.length === 0, reasons }
}

