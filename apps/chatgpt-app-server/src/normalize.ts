import type { JsonObject } from '../../../src/mcp/types.js'
import { asJsonObject } from '../../../src/lib/json.js'
import { defaultToolRegistry } from '../../../src/config/defaultToolRegistry.js'
import { mergeToolRegistry, resolveToolRegistryRule } from '../../../src/mcp/registry/toolRegistry.js'
import { getAdapter } from '../../../src/adapters/registry.js'
import type { ResultBlock } from '../../../src/results/types.js'
import { makeWidgetStructuredContent, type WidgetStructuredContent } from './contracts.js'

const DANGEROUS_PATTERN =
  /(create|update|delete|write|submit|order|trade|execute|rebalance|transfer|withdraw|deposit)/i

export function assertReadonlyTool(toolName: string, allowWriteThrough: boolean) {
  if (allowWriteThrough) return
  if (DANGEROUS_PATTERN.test(toolName)) {
    throw new Error(`Tool "${toolName}" appears non-read-only and is blocked by default.`)
  }
}

export function toWidgetStructuredContent(input: {
  requestedTool: string
  sourceTool: string
  sourcePayload: unknown
  viewId?: string
  title: string
  description?: string
}): WidgetStructuredContent {
  const raw = asJsonObject(input.sourcePayload) ?? { raw: String(input.sourcePayload ?? '') }
  const rules = mergeToolRegistry(defaultToolRegistry(), undefined)
  const resolved = resolveToolRegistryRule(input.sourceTool, rules)
  const adapter = getAdapter(resolved.adapterId)
  const blocks: ResultBlock[] = adapter(input.sourceTool, raw as JsonObject)
  return makeWidgetStructuredContent({
    viewId: input.viewId ?? resolved.page,
    title: input.title,
    description: input.description ?? resolved.description,
    requestedTool: input.requestedTool,
    sourceTool: input.sourceTool,
    blocks,
    raw,
  })
}
