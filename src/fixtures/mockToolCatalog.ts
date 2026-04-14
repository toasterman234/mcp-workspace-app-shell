import type { McpToolDefinition } from '../mcp/types'
import type { ToolCallResult } from '../mcp/types'
import type { JsonObject, JsonValue } from '../mcp/types'
import { mockPortfolioPayload } from './payloads/portfolio'
import { mockBacktestPayload } from './payloads/backtest'
import { mockScannerPayload } from './payloads/scanner'
import { mockEtfPayload } from './payloads/etf'
import { mockJobsPayload } from './payloads/jobs'
import { mockFactorExposurePayload } from './payloads/factorExposure'
import { mockMarketRegimePayload } from './payloads/marketRegime'
import { mockTradierScanPayload } from './payloads/tradierScan'

/**
 * Example tool names — MCPHub may expose completely different names.
 * The registry + adapters keep the UI decoupled from these strings.
 */
export function mockToolCatalog(): McpToolDefinition[] {
  return [
    { name: 'workspace.echo', description: 'Echo structured payload for UI testing' },
    { name: 'portfolio.snapshot', description: 'Holdings + exposures snapshot' },
    { name: 'backtest.run_summary', description: 'Backtest metrics + equity curve' },
    { name: 'scanner.rank', description: 'Ranked candidates from a scan' },
    { name: 'etf.profile', description: 'ETF factor / style / yield profile' },
    { name: 'research.factor_exposure', description: 'Grouped factor / style exposures' },
    { name: 'market.regime_summary', description: 'Macro regime + breadth-style summary' },
    { name: 'tradier.scan_candidates', description: 'Broker-style ranked scan (mock Tradier)' },
    { name: 'jobs.recent', description: 'Recent job runs + log tail' },
  ]
}

export function mockToolHandler(
  name: string,
  args: JsonObject | undefined,
): ToolCallResult {
  const echoPayload: JsonValue | undefined = args?.payload as JsonValue | undefined
  switch (name) {
    case 'workspace.echo':
      return { structuredContent: echoPayload ?? { message: 'no payload provided' } }
    case 'portfolio.snapshot':
      return { structuredContent: mockPortfolioPayload() }
    case 'backtest.run_summary':
      return { structuredContent: mockBacktestPayload() }
    case 'scanner.rank':
      return { structuredContent: mockScannerPayload() }
    case 'etf.profile':
      return { structuredContent: mockEtfPayload() }
    case 'research.factor_exposure':
      return { structuredContent: mockFactorExposurePayload() }
    case 'market.regime_summary':
      return { structuredContent: mockMarketRegimePayload() }
    case 'tradier.scan_candidates':
      return { structuredContent: mockTradierScanPayload() }
    case 'jobs.recent':
      return { structuredContent: mockJobsPayload() }
    default:
      return {
        isError: true,
        errorMessage: `Unknown mock tool: ${name}`,
      }
  }
}
