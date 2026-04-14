import type { JsonObject } from '../mcp/types'
import { normalizeToolResult } from '../mcp/normalize/normalizeToolResult'
import type { NormalizedToolResult } from '../mcp/normalize/types'
import { resultBlocksFromNormalized } from '../results/fromNormalized'
import type { ToolAdapter } from './types'

function toNormalized(toolName: string, raw: JsonObject): NormalizedToolResult[] {
  const blocks: NormalizedToolResult[] = []
  if (Array.isArray(raw.filters))
    blocks.push(normalizeToolResult(toolName, { filters: raw.filters, title: raw.title }, 'filters'))
  if (Array.isArray(raw.rows))
    blocks.push(
      normalizeToolResult(toolName, { rows: raw.rows, columns: raw.columns, title: raw.title }, 'table'),
    )
  if (!blocks.length) blocks.push(normalizeToolResult(toolName, raw, 'json'))
  return blocks
}

export const screenerAdapter: ToolAdapter = (toolName, raw) =>
  resultBlocksFromNormalized(toolName, toNormalized(toolName, raw))
