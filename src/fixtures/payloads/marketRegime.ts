import type { JsonObject } from '../../mcp/types'

/** Simulated macro / regime summary (market.*). */
export function mockMarketRegimePayload(): JsonObject {
  return {
    title: 'Market regime summary (mock)',
    kpis: [
      { label: 'Regime', value: 'Risk-on / broad', tone: 'positive' },
      { label: 'Breadth', value: '62%', tone: 'neutral' },
      { label: 'Credit stress', value: 'Low', tone: 'positive' },
    ],
    events: [
      {
        id: 'e1',
        ts: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        level: 'info',
        message: 'Volatility cluster: suppressed (VIX < 20)',
      },
      {
        id: 'e2',
        ts: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        level: 'warn',
        message: 'Leadership: narrow → monitor for rotation',
      },
    ],
  }
}
