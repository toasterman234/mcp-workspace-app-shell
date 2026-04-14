import type { ToolRegistryRule } from './types'

/**
 * Default tool → page, category, adapter, and catalog “sample renderer” hints.
 * User rules in settings are prepended so the first pattern match wins.
 */
export function defaultToolRegistry(): ToolRegistryRule[] {
  return [
    {
      pattern: 'tradier.*',
      page: 'scanners',
      category: 'Broker / Tradier',
      adapterId: 'generic',
      sampleRenderer: 'generic_card',
      description:
        'Broker-style MCP tools: use generic JSON/heuristic rendering (MCP payloads vary widely; avoid scan-only layouts).',
    },
    {
      pattern: 'etf.*',
      page: 'research',
      category: 'ETF / factors',
      adapterId: 'etf',
      sampleRenderer: 'etf_factor',
      description: 'ETF snapshots, holdings tables, and factor tilts.',
    },
    {
      pattern: 'research.*',
      page: 'research',
      category: 'Research',
      adapterId: 'generic',
      sampleRenderer: 'research_workspace',
      description: 'Structured research payloads until a dedicated research adapter ships.',
    },
    {
      pattern: 'screener.*',
      page: 'scanners',
      category: 'Screeners',
      adapterId: 'screener',
      sampleRenderer: 'scan_ranked',
      description: 'Ranked lists, filters, and tabular scan output.',
    },
    {
      pattern: 'scanner.*',
      page: 'scanners',
      category: 'Screeners',
      adapterId: 'screener',
      sampleRenderer: 'scan_ranked',
    },
    {
      pattern: '*portfolio*',
      page: 'portfolio',
      category: 'Portfolio',
      adapterId: 'portfolio',
      sampleRenderer: 'portfolio_dashboard',
    },
    {
      pattern: '*backtest*',
      page: 'backtests',
      category: 'Backtests',
      adapterId: 'backtest',
      sampleRenderer: 'backtest_equity',
    },
    {
      pattern: '*job*',
      page: 'jobs',
      category: 'Jobs & logs',
      adapterId: 'jobs',
      sampleRenderer: 'jobs_timeline',
    },
    {
      pattern: '*log*',
      page: 'jobs',
      category: 'Jobs & logs',
      adapterId: 'jobs',
      sampleRenderer: 'jobs_timeline',
    },
    {
      pattern: 'market.*',
      page: 'overview',
      category: 'Macro',
      adapterId: 'generic',
      sampleRenderer: 'generic_card',
      description: 'Regime and macro summaries via generic cards until a macro view exists.',
    },
    {
      pattern: '*',
      page: 'overview',
      category: 'General',
      adapterId: 'generic',
      sampleRenderer: 'generic_card',
      description: 'Unknown tools: heuristic blocks + raw JSON.',
    },
  ]
}
