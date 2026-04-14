import type { AdapterId } from '../config/types'
import type { ToolAdapter } from './types'
import { genericAdapter } from './genericAdapter'
import { portfolioAdapter } from './portfolioAdapter'
import { backtestAdapter } from './backtestAdapter'
import { screenerAdapter } from './screenerAdapter'
import { etfAdapter } from './etfAdapter'
import { jobsAdapter } from './jobsAdapter'

const byId: Record<AdapterId, ToolAdapter> = {
  generic: genericAdapter,
  portfolio: portfolioAdapter,
  backtest: backtestAdapter,
  screener: screenerAdapter,
  etf: etfAdapter,
  jobs: jobsAdapter,
}

export function getAdapter(id: AdapterId): ToolAdapter {
  return byId[id] ?? genericAdapter
}
