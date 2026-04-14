import { createContext } from 'react'
import type { HostContextValue } from './types'

export const HostContext = createContext<HostContextValue | null>(null)
