/**
 * Optional ChatGPT / OpenAI Apps SDK bridge helpers.
 * Keep every entry behind feature detection — never required for core flows.
 *
 * TODO: Wire real `window.openai` calls when running inside ChatGPT iframe.
 */
export function readChatgptToolOutput<T = unknown>(): T | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { openai?: { toolOutput?: T } }
  return w.openai?.toolOutput
}

export function readChatgptToolInput<T = unknown>(): T | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { openai?: { toolInput?: T } }
  return w.openai?.toolInput
}
