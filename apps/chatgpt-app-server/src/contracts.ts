import type { JsonObject } from '../../../src/mcp/types.js'
import type { CanvasDocument } from '../../../src/canvas/types.js'
import type { ResultBlock } from '../../../src/results/types.js'

export interface WidgetStructuredContent {
  schemaVersion: 'workspace.v1'
  surface: 'chatgpt-widget'
  view: {
    id: string
    title: string
    description?: string
  }
  requestedTool: string
  sourceTool: string
  blocks: ResultBlock[]
  raw?: JsonObject
  catalog?: {
    tools: Array<{
      name: string
      description?: string
      inputSchema?: JsonObject
    }>
    errorMessage?: string
  }
  /** Compatibility bridge for universal renderer migration. */
  canvas?: CanvasDocument
}

export function makeWidgetStructuredContent(input: {
  viewId: string
  title: string
  description?: string
  requestedTool: string
  sourceTool: string
  blocks: ResultBlock[]
  raw?: JsonObject
  canvas?: CanvasDocument
}): WidgetStructuredContent {
  return {
    schemaVersion: 'workspace.v1',
    surface: 'chatgpt-widget',
    view: { id: input.viewId, title: input.title, description: input.description },
    requestedTool: input.requestedTool,
    sourceTool: input.sourceTool,
    blocks: input.blocks,
    raw: input.raw,
    canvas: input.canvas,
  }
}
