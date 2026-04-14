import type { JsonObject } from '../../mcp/types'

export function mockScannerPayload(): JsonObject {
  return {
    title: 'Liquidity + Momentum Screen',
    filters: [
      { id: 'adv', label: 'ADV ($)', value: '> $25M' },
      { id: 'mom', label: '12-1 Mom', value: 'Top quartile' },
      { id: 'vol', label: 'IV Rank', value: '< 40%' },
    ],
    rows: [
      { symbol: 'NVDA', score: '92', sector: 'Semis', note: 'Strong flow' },
      { symbol: 'META', score: '88', sector: 'Comm Svcs', note: 'Breakout' },
      { symbol: 'LLY', score: '84', sector: 'Health', note: 'Relative strength' },
      { symbol: 'CAT', score: '80', sector: 'Industrials', note: 'Earnings drift' },
    ],
    columns: [
      { key: 'symbol', label: 'Symbol' },
      { key: 'score', label: 'Score' },
      { key: 'sector', label: 'Sector' },
      { key: 'note', label: 'Comment' },
    ],
  }
}
