import type { JsonObject } from '../../mcp/types'

export function mockBacktestPayload(): JsonObject {
  const equity = Array.from({ length: 40 }).map((_, i) => ({
    x: `D-${40 - i}`,
    y: 100_000 + i * 950 + (i % 5) * 200,
  }))
  return {
    title: 'ORB / Mean Reversion — ES (15m)',
    kpis: [
      { label: 'CAGR', value: '11.4%', tone: 'positive' },
      { label: 'Sharpe', value: '1.05', tone: 'positive' },
      { label: 'Win %', value: '52%', tone: 'neutral' },
      { label: 'Max DD', value: '-8.7%', tone: 'negative' },
    ],
    series: [{ name: 'Equity', data: equity }],
    rows: [
      { time: '09:45', side: 'LONG', qty: '2', price: '5120.25', pnl: '+$420' },
      { time: '10:12', side: 'FLAT', qty: '2', price: '5126.50', pnl: '+$250' },
      { time: '13:05', side: 'SHORT', qty: '1', price: '5114.00', pnl: '-$90' },
    ],
    columns: [
      { key: 'time', label: 'Time' },
      { key: 'side', label: 'Side' },
      { key: 'qty', label: 'Qty' },
      { key: 'price', label: 'Price' },
      { key: 'pnl', label: 'Trade PnL' },
    ],
  }
}
