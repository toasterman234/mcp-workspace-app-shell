import type { JsonObject, JsonValue } from '../mcp/types'

export function asJsonObject(v: unknown): JsonObject | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as JsonObject
  return null
}

export function asJsonValue(v: unknown): JsonValue | undefined {
  if (v === undefined) return undefined
  return v as JsonValue
}
