import type { JsonObject } from '../../mcp/types'

export function mockPortfolioPayload(): JsonObject {
  return {
    title: 'Paper Portfolio — Core',
    kpis: [
      { label: 'Net Liq', value: '$1,024,880', delta: '+1.2%', tone: 'positive' },
      { label: 'Day PnL', value: '+$3,410', delta: '+0.33%', tone: 'positive' },
      { label: 'Beta (SPY)', value: '0.94', tone: 'neutral' },
      { label: 'Max DD (90d)', value: '-6.1%', tone: 'negative' },
    ],
    metrics: [
      { id: 'exp_us', label: 'US Equity', value: '58%' },
      { id: 'exp_intl', label: 'Intl Equity', value: '17%' },
      { id: 'exp_credit', label: 'Credit', value: '12%' },
      { id: 'exp_alt', label: 'Alts', value: '13%' },
    ],
    rows: [
      { symbol: 'SPY', weight: '18%', sector: 'US Large Blend', beta: '1.00' },
      { symbol: 'EFA', weight: '9%', sector: 'Intl Dev', beta: '0.88' },
      { symbol: 'AGG', weight: '12%', sector: 'Core Bond', beta: '0.02' },
      { symbol: 'VNQ', weight: '6%', sector: 'Real Assets', beta: '0.74' },
    ],
    columns: [
      { key: 'symbol', label: 'Ticker' },
      { key: 'weight', label: 'Weight' },
      { key: 'sector', label: 'Style / sleeve' },
      { key: 'beta', label: 'β' },
    ],
  }
}
