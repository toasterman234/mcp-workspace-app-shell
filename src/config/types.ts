/**
 * User-editable app configuration persisted in localStorage.
 * MCPHub is the only runtime tool endpoint the UI targets.
 */
export type HostMode = 'auto' | 'generic' | 'chatgpt-extensions'

export type DataMode = 'mock' | 'live'

export type AdapterId = 'generic' | 'portfolio' | 'backtest' | 'screener' | 'etf' | 'jobs'

/** Catalog hint: which bespoke layout would ideally own this pattern (today many map to generic blocks). */
export type SampleRendererId =
  | 'generic_card'
  | 'portfolio_dashboard'
  | 'backtest_equity'
  | 'scan_ranked'
  | 'etf_factor'
  | 'jobs_timeline'
  | 'research_workspace'

export interface FeatureFlags {
  /** Enable optional ChatGPT / window.openai bridge helpers (non-portable). */
  chatgptExtensions: boolean
  /** Allow tool calls that are not marked read-only (future; default false). */
  allowWriteTools: boolean
  /** Verbose MCP protocol logging in the UI log panel. */
  debugMcp: boolean
}

/**
 * One registry row: pattern match → shell page + adapter plugin + catalog metadata.
 * Extend via Settings JSON without redesigning pages.
 */
export interface ToolRegistryRule {
  pattern: string
  page: string
  category: string
  adapterId: AdapterId
  sampleRenderer: SampleRendererId
  /** Shown on the tool catalog for this pattern (optional). */
  description?: string
}

/** @deprecated Legacy v1 settings — migrated to toolRegistry on load. */
export interface ToolPageMappingRule {
  pattern: string
  page: string
  preferredHint?: string
}

export interface AppSettings {
  appTitle: string
  mcphubBaseUrl: string
  /** Optional path suffix if hub mounts MCP under a subpath (hub-specific). */
  mcphubMcpPath: string
  hostMode: HostMode
  dataMode: DataMode
  featureFlags: FeatureFlags
  toolRegistry: ToolRegistryRule[]
}

export const defaultFeatureFlags = (): FeatureFlags => ({
  chatgptExtensions: false,
  allowWriteTools: false,
  debugMcp: false,
})
