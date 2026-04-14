import { create } from 'zustand'
import type { AppSettings } from '../config/types'
import { defaultAppSettings } from '../config/defaultSettings'
import { loadSettings, saveSettings } from './storage'
import type { McpClient } from '../mcp/McpClient'
import { createMcpClient } from '../mcp/createMcpClient'
import type { McpToolDefinition } from '../mcp/types'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface LogEntry {
  id: string
  ts: string
  level: 'info' | 'warn' | 'error'
  message: string
  detail?: string
}

interface AppStore {
  settings: AppSettings
  client: McpClient
  connection: ConnectionStatus
  lastError: string | null
  tools: McpToolDefinition[]
  logs: LogEntry[]
  setSettings: (partial: Partial<AppSettings>) => void
  resetSettings: () => void
  pushLog: (entry: Omit<LogEntry, 'id' | 'ts'> & Partial<Pick<LogEntry, 'id' | 'ts'>>) => void
  refreshClient: () => void
  discoverTools: () => Promise<void>
  pingHub: () => Promise<void>
}

const fallback = defaultAppSettings()

function withClient(settings: AppSettings): McpClient {
  return createMcpClient(settings)
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: loadSettings(fallback),
  client: withClient(loadSettings(fallback)),
  connection: 'idle',
  lastError: null,
  tools: [],
  logs: [
    {
      id: 'boot',
      ts: new Date().toISOString(),
      level: 'info',
      message: 'Workspace shell initialized (read-only default).',
    },
  ],

  setSettings: (partial) => {
    const next = { ...get().settings, ...partial }
    if (partial.featureFlags) {
      next.featureFlags = { ...get().settings.featureFlags, ...partial.featureFlags }
    }
    saveSettings(next)
    set({
      settings: next,
      client: withClient(next),
    })
    get().pushLog({ level: 'info', message: 'Settings updated.' })
  },

  resetSettings: () => {
    const fresh = defaultAppSettings()
    saveSettings(fresh)
    set({ settings: fresh, client: withClient(fresh) })
    get().pushLog({ level: 'info', message: 'Settings reset to defaults.' })
  },

  pushLog: (entry) => {
    const id = entry.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const ts = entry.ts ?? new Date().toISOString()
    set((s) => ({ logs: [{ ...entry, id, ts }, ...s.logs].slice(0, 500) }))
  },

  refreshClient: () => {
    set({ client: withClient(get().settings) })
  },

  discoverTools: async () => {
    set({ connection: 'connecting', lastError: null })
    try {
      const { tools } = await get().client.listTools()
      set({ tools, connection: 'connected' })
      get().pushLog({
        level: 'info',
        message: `Discovered ${tools.length} tools via MCP client.`,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'discovery failed'
      set({ connection: 'error', lastError: msg, tools: [] })
      get().pushLog({ level: 'error', message: 'Tool discovery failed', detail: msg })
    }
  },

  pingHub: async () => {
    set({ connection: 'connecting', lastError: null })
    try {
      const res = await get().client.ping()
      if (!res.ok) {
        set({ connection: 'error', lastError: res.detail ?? 'ping failed' })
        get().pushLog({ level: 'warn', message: 'MCPHub ping failed', detail: res.detail })
        return
      }
      set({ connection: 'connected', lastError: null })
      get().pushLog({ level: 'info', message: 'MCPHub reachable.', detail: res.detail })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ping failed'
      set({ connection: 'error', lastError: msg })
      get().pushLog({ level: 'error', message: 'MCPHub ping error', detail: msg })
    }
  },
}))
