type JsonRpcMessage = { jsonrpc?: string; method?: string; params?: unknown; id?: number | string; result?: unknown; error?: unknown }

type PendingResolver = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}

export class McpAppsBridge {
  private nextId = 1
  private pending = new Map<number, PendingResolver>()
  private onResultHandlers = new Set<(params: any) => void>()
  private onInputHandlers = new Set<(params: any) => void>()

  constructor() {
    window.addEventListener('message', this.handleMessage, { passive: true })
  }

  destroy() {
    window.removeEventListener('message', this.handleMessage)
    this.pending.clear()
    this.onResultHandlers.clear()
    this.onInputHandlers.clear()
  }

  onToolResult(handler: (params: any) => void): () => void {
    this.onResultHandlers.add(handler)
    return () => this.onResultHandlers.delete(handler)
  }

  onToolInput(handler: (params: any) => void): () => void {
    this.onInputHandlers.add(handler)
    return () => this.onInputHandlers.delete(handler)
  }

  getOpenAiGlobals() {
    const openai = (window as any).openai
    return {
      toolInput: openai?.toolInput,
      toolOutput: openai?.toolOutput,
    }
  }

  async callTool(name: string, args: Record<string, unknown>) {
    return this.request('tools/call', { name, arguments: args })
  }

  async updateModelContext(text: string) {
    return this.request('ui/update-model-context', {
      content: [{ type: 'text', text }],
    })
  }

  sendFollowUpMessage(text: string) {
    window.parent.postMessage(
      {
        jsonrpc: '2.0',
        method: 'ui/message',
        params: { role: 'user', content: [{ type: 'text', text }] },
      },
      '*',
    )
  }

  private request(method: string, params: Record<string, unknown>) {
    const id = this.nextId++
    const payload = { jsonrpc: '2.0', id, method, params }
    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
    window.parent.postMessage(payload, '*')
    return p
  }

  private handleMessage = (event: MessageEvent) => {
    if (event.source !== window.parent) return
    const msg = event.data as JsonRpcMessage
    if (!msg || msg.jsonrpc !== '2.0') return

    if (msg.method === 'ui/notifications/tool-result') {
      for (const h of this.onResultHandlers) h(msg.params)
      return
    }
    if (msg.method === 'ui/notifications/tool-input') {
      for (const h of this.onInputHandlers) h(msg.params)
      return
    }
    if (typeof msg.id === 'number') {
      const pending = this.pending.get(msg.id)
      if (!pending) return
      this.pending.delete(msg.id)
      if (msg.error) pending.reject(msg.error)
      else pending.resolve(msg.result)
    }
  }
}
