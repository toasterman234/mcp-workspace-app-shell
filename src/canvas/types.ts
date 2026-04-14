import type { JsonValue } from '../mcp/types'
import type { ResultBlock } from '../results/types'

export interface CanvasView {
  id: string
  title: string
  description?: string
}

export interface CanvasError {
  code: string
  message: string
  details?: JsonValue
}

export interface VegaLiteBlock {
  id: string
  kind: 'vega_lite'
  title?: string
  /** Keep as generic JSON for now; enforce policy via validator. */
  spec: Record<string, unknown>
}

/** v1 canvas supports existing ResultBlock set plus declarative chart grammar block. */
export type CanvasBlock = ResultBlock | VegaLiteBlock

export interface CanvasDocument {
  schemaVersion: 'canvas.v1'
  view: CanvasView
  blocks: CanvasBlock[]
  raw?: Record<string, unknown>
  errors?: CanvasError[]
}

/**
 * Current app-shell contract carried in structuredContent.
 * Keep this local type narrow and migration-friendly.
 */
export interface WorkspaceV1Document {
  schemaVersion: 'workspace.v1'
  view: CanvasView
  requestedTool: string
  sourceTool: string
  blocks: ResultBlock[]
  raw?: Record<string, unknown>
  catalog?: {
    tools: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>
    errorMessage?: string
  }
}

