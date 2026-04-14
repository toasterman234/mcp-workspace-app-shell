import type { JsonObject } from '../../../src/mcp/types.js'

/**
 * Option A: one generic ChatGPT-facing workspace tool.
 * The model/UI can list MCPHub tools and run a selected read-only tool.
 */
export type CuratedToolName = 'run_workspace_tool'

export interface CuratedToolSpec {
  name: CuratedToolName
  title: string
  description: string
  inputSchema: JsonObject
}

export const CURATED_TOOLS: CuratedToolSpec[] = [
  {
    name: 'run_workspace_tool',
    title: 'Run workspace tool',
    description:
      'Generic MCP workspace entrypoint: list available MCPHub tools and run a selected read-only tool.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['list', 'run'],
          description: 'list = return available tools, run = execute selected tool',
        },
        toolName: {
          type: 'string',
          description: 'MCPHub tool to execute when mode=run',
        },
        viewId: {
          type: 'string',
          description: 'Optional widget view id override',
        },
        title: {
          type: 'string',
          description: 'Optional widget title override',
        },
        arguments: {
          type: 'object',
          description: 'Optional arguments passed to selected MCPHub tool',
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
]

export function getCuratedSpec(name: string): CuratedToolSpec | undefined {
  return CURATED_TOOLS.find((t) => t.name === name)
}
