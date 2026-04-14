import type { JsonObject } from '../../mcp/types'

export function mockJobsPayload(): JsonObject {
  return {
    title: 'Recent Jobs',
    events: [
      { id: '1', ts: new Date(Date.now() - 1000 * 60 * 12).toISOString(), level: 'info', message: 'scanner.rank completed (42 symbols)' },
      { id: '2', ts: new Date(Date.now() - 1000 * 60 * 55).toISOString(), level: 'warn', message: 'backtest.run_summary retried once (timeout)' },
      { id: '3', ts: new Date(Date.now() - 1000 * 60 * 120).toISOString(), level: 'error', message: 'portfolio.snapshot failed validation' },
    ],
    rows: [
      { job: 'nightly-scanner', status: 'SUCCESS', duration: '3m 12s' },
      { job: 'factor-refresh', status: 'RUNNING', duration: '—' },
      { job: 'options-chain-cache', status: 'QUEUED', duration: '—' },
    ],
    columns: [
      { key: 'job', label: 'Job' },
      { key: 'status', label: 'Status' },
      { key: 'duration', label: 'Duration' },
    ],
  }
}
