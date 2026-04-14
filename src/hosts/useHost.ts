import { useContext } from 'react'
import { HostContext } from './context'
import type { HostContextValue } from './types'

export function useHost(): HostContextValue {
  const v = useContext(HostContext)
  if (!v) {
    return {
      kind: 'generic',
      label: 'Generic',
      capabilities: { mcpAppsCore: true, chatgptExtensions: false, themeBridge: true },
    }
  }
  return v
}
