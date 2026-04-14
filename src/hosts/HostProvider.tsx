import { useMemo, type ReactNode } from 'react'
import { useAppStore } from '../state/useAppStore'
import { HostContext } from './context'
import { detectHost } from './detectHost'

export function HostProvider({ children }: { children: ReactNode }) {
  const chatgptFlag = useAppStore((s) => s.settings.featureFlags.chatgptExtensions)
  const hostMode = useAppStore((s) => s.settings.hostMode)
  const value = useMemo(() => detectHost(chatgptFlag, hostMode), [chatgptFlag, hostMode])
  return <HostContext.Provider value={value}>{children}</HostContext.Provider>
}
