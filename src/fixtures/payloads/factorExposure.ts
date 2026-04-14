import type { JsonObject } from '../../mcp/types'

/** Simulated factor / style exposure (research.* style output). */
export function mockFactorExposurePayload(): JsonObject {
  return {
    title: 'Portfolio factor exposure (mock)',
    kpis: [
      { label: 'HML beta', value: '0.18', tone: 'neutral' },
      { label: 'UMD beta', value: '0.09', tone: 'positive' },
      { label: 'Quality tilt', value: '+0.22σ', tone: 'positive' },
    ],
    groups: [
      {
        id: 'style',
        title: 'Style buckets',
        metrics: [
          { id: 'val', label: 'Value', value: 'OW', sublabel: 'vs benchmark' },
          { id: 'mom', label: 'Momentum', value: 'Neutral' },
          { id: 'siz', label: 'Size', value: 'UW' },
        ],
      },
      {
        id: 'sector',
        title: 'Sector tilts',
        metrics: [
          { id: 'tech', label: 'Technology', value: '+3.1%' },
          { id: 'fin', label: 'Financials', value: '-1.4%' },
          { id: 'hc', label: 'Health Care', value: '+0.8%' },
        ],
      },
    ],
  }
}
