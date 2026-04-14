import type { AppSettings, ToolPageMappingRule, ToolRegistryRule } from '../config/types'

const KEY = 'mcp-workspace-app.settings.v1'

function migrateToolRegistry(parsed: Partial<AppSettings>): ToolRegistryRule[] | undefined {
  if (Array.isArray(parsed.toolRegistry) && parsed.toolRegistry.length > 0) {
    return parsed.toolRegistry as ToolRegistryRule[]
  }
  const legacy = (parsed as { toolMappings?: ToolPageMappingRule[] }).toolMappings
  if (Array.isArray(legacy) && legacy.length > 0) {
    return legacy.map((m) => ({
      pattern: m.pattern,
      page: m.page,
      category: 'Custom',
      adapterId: 'generic',
      sampleRenderer: 'generic_card',
    }))
  }
  return undefined
}

export function loadSettings(fallback: AppSettings): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    const toolRegistry = migrateToolRegistry(parsed) ?? fallback.toolRegistry
    return {
      ...fallback,
      ...parsed,
      featureFlags: { ...fallback.featureFlags, ...parsed.featureFlags },
      toolRegistry,
    }
  } catch {
    return fallback
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(settings))
}
