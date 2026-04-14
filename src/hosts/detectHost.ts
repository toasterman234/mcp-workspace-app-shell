import type { HostMode } from '../config/types'
import type { HostCapabilities, HostContextValue, HostKind } from './types'

declare global {
  interface Window {
    openai?: Record<string, unknown>
  }
}

function detectKind(hostMode: HostMode): HostKind {
  if (typeof window === 'undefined') return 'unknown'
  if (hostMode === 'generic') return 'generic'
  if (hostMode === 'chatgpt-extensions') return window.openai ? 'chatgpt' : 'generic'
  if (window.openai) return 'chatgpt'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('claude')) return 'claude'
  return 'generic'
}

function labelFor(kind: HostKind): string {
  switch (kind) {
    case 'chatgpt':
      return 'ChatGPT (MCP Apps + optional extensions)'
    case 'claude':
      return 'Claude / Desktop-style host'
    case 'generic':
      return 'Generic MCP Apps host / local workbench'
    default:
      return 'Unknown host'
  }
}

export function detectHost(featureFlagChatgpt: boolean, hostMode: HostMode): HostContextValue {
  const kind = detectKind(hostMode)
  const chatgptExtensions = Boolean(
    typeof window !== 'undefined' && featureFlagChatgpt && kind === 'chatgpt' && window.openai,
  )
  const capabilities: HostCapabilities = {
    mcpAppsCore: true,
    chatgptExtensions,
    themeBridge: true,
  }
  return { kind, label: labelFor(kind), capabilities }
}
