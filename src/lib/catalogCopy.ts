import type { SampleRendererId } from '../config/types'

const LABELS: Record<SampleRendererId, string> = {
  generic_card: 'Generic result cards',
  portfolio_dashboard: 'Portfolio dashboard (custom later)',
  backtest_equity: 'Equity + metrics (custom later)',
  scan_ranked: 'Scan / ranked list',
  etf_factor: 'ETF / factor profile',
  jobs_timeline: 'Jobs + event timeline',
  research_workspace: 'Research workspace',
}

export function sampleRendererLabel(id: SampleRendererId): string {
  return LABELS[id] ?? id
}
