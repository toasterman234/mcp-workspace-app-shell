import type { JsonObject } from '../../mcp/types'

export function mockEtfPayload(): JsonObject {
  return {
    title: 'US Quality Factor ETF',
    kpis: [
      { label: 'SEC Yield', value: '1.9%', tone: 'neutral' },
      { label: 'Expense', value: '0.15%', tone: 'positive' },
      { label: 'Avg Mkt Cap', value: '$180B', tone: 'neutral' },
      { label: 'P/E (NTM)', value: '19.4x', tone: 'neutral' },
    ],
    metrics: [
      { id: 'style', label: 'Style', value: 'Large Blend', sublabel: 'Morningstar' },
      { id: 'mom', label: 'Momentum', value: 'Overweight' },
      { id: 'vol', label: 'Volatility', value: 'Underweight' },
      { id: 'qual', label: 'Quality', value: 'Overweight' },
    ],
    rows: [
      { holding: 'MSFT', weight: '8.1%', sector: 'Tech' },
      { holding: 'AAPL', weight: '7.4%', sector: 'Tech' },
      { holding: 'UNH', weight: '4.2%', sector: 'Health' },
    ],
    columns: [
      { key: 'holding', label: 'Holding' },
      { key: 'weight', label: 'Weight' },
      { key: 'sector', label: 'Sector' },
    ],
  }
}
