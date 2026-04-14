export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema?: JsonObject
  /** Optional annotations from hub (ignored if unknown). */
  meta?: JsonObject
}

export interface ToolCallParams {
  name: string
  arguments?: JsonObject
  /** When false, client should refuse unless allowWriteTools is on. */
  readOnlyIntent?: boolean
}

export interface ToolCallResult {
  /** Raw structured payload from MCP content blocks (hub-specific). */
  structuredContent?: JsonValue
  content?: { type: string; text?: string }[]
  isError?: boolean
  /** Best-effort error text */
  errorMessage?: string
}

export interface ListToolsResult {
  tools: McpToolDefinition[]
}
