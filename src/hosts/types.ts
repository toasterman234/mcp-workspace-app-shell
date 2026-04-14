export type HostKind = 'generic' | 'chatgpt' | 'claude' | 'unknown'

export interface HostCapabilities {
  /** Standard MCP Apps bridge surface (tool I/O) — always true in hosted widget contexts. */
  mcpAppsCore: boolean
  /** Optional OpenAI / ChatGPT extensions (window.openai). */
  chatgptExtensions: boolean
  /** Host exposes theme token contract. */
  themeBridge: boolean
}

export interface HostContextValue {
  kind: HostKind
  label: string
  capabilities: HostCapabilities
}
