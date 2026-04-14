import type { JsonObject } from '../mcp/types'
import type { ResultBlock } from '../results/types'

export type ToolAdapter = (toolName: string, raw: JsonObject) => ResultBlock[]
