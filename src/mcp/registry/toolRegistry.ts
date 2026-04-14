import type { ToolRegistryRule } from '../../config/types'
import { defaultToolRegistry } from '../../config/defaultToolRegistry'

export interface RegisteredTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/** Very small `*` glob matcher (case-insensitive, ordered segments). */
export function matchToolPattern(toolName: string, pattern: string): boolean {
  const p = pattern.toLowerCase()
  const t = toolName.toLowerCase()
  if (p === '*') return true
  const segments = p.split('*')
  let idx = 0
  for (const seg of segments) {
    if (!seg) continue
    const found = t.indexOf(seg, idx)
    if (found === -1) return false
    idx = found + seg.length
  }
  return true
}

export function mergeToolRegistry(
  base: ToolRegistryRule[],
  extra: ToolRegistryRule[] | undefined,
): ToolRegistryRule[] {
  if (!extra?.length) return [...base]
  return [...extra, ...base]
}

/** First matching rule wins (caller should pass user rules before defaults). */
export function resolveToolRegistryRule(toolName: string, rules: ToolRegistryRule[]): ToolRegistryRule {
  for (const rule of rules) {
    if (matchToolPattern(toolName, rule.pattern)) return rule
  }
  const fb = defaultToolRegistry().find((r) => r.pattern === '*')
  return fb ?? { pattern: '*', page: 'overview', category: 'General', adapterId: 'generic', sampleRenderer: 'generic_card' }
}

export function resolveToolPage(toolName: string, rules: ToolRegistryRule[]): string {
  return resolveToolRegistryRule(toolName, rules).page
}

export function toolDisplayName(name: string): string {
  return name.replace(/[_:]/g, ' ')
}
