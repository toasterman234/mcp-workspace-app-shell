import { useEffect, useMemo, useState } from 'react'
import type { ResultBlock } from '../results/types'
import { useAppStore } from '../state/useAppStore'
import { asJsonObject } from '../lib/json'
import { defaultToolRegistry } from '../config/defaultToolRegistry'
import { mergeToolRegistry, resolveToolRegistryRule } from '../mcp/registry/toolRegistry'
import { getAdapter } from '../adapters/registry'

export function useWorkspaceTool(toolName: string) {
  const client = useAppStore((s) => s.client)
  const settings = useAppStore((s) => s.settings)
  const pushLog = useAppStore((s) => s.pushLog)

  const rules = useMemo(
    () => mergeToolRegistry(defaultToolRegistry(), settings.toolRegistry),
    [settings.toolRegistry],
  )
  const rule = useMemo(() => resolveToolRegistryRule(toolName, rules), [toolName, rules])
  const adapt = useMemo(() => getAdapter(rule.adapterId), [rule.adapterId])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<ResultBlock[]>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await client.callTool({ name: toolName, readOnlyIntent: true })
        if (res.isError) {
          throw new Error(res.errorMessage ?? 'Tool error')
        }
        const obj = asJsonObject(res.structuredContent)
        if (!obj) throw new Error('Expected structured JSON object from tool')
        const next = adapt(toolName, obj)
        if (!cancelled) setBlocks(next)
        pushLog({ level: 'info', message: `Loaded ${toolName}`, detail: `${next.length} blocks` })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load tool'
        if (!cancelled) {
          setError(msg)
          setBlocks([])
        }
        pushLog({ level: 'error', message: `Tool ${toolName} failed`, detail: msg })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toolName, client, adapt, pushLog])

  return { loading, error, blocks, rule }
}
