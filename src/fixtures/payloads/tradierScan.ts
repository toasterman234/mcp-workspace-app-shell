import type { JsonObject } from '../../mcp/types'

/** Simulated Tradier-style scan output (tradier.* → screener adapter in registry). */
export function mockTradierScanPayload(): JsonObject {
  return {
    title: 'Tradier scan — liquid momentum (mock)',
    filters: [
      { id: 'ex', label: 'Exchange', value: 'US equities' },
      { id: 'liq', label: 'Min ADV', value: '$15M' },
    ],
    rows: [
      { symbol: 'AMD', score: '91', last: '$172.40' },
      { symbol: 'AVGO', score: '89', last: '$298.10' },
      { symbol: 'CRM', score: '85', last: '$285.00' },
    ],
    columns: [
      { key: 'symbol', label: 'Symbol' },
      { key: 'score', label: 'Score' },
      { key: 'last', label: 'Last' },
    ],
  }
}
