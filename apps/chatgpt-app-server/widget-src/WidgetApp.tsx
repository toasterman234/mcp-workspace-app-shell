import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { workspaceV1ToCanvas } from '../../../src/canvas/compat.js'
import { validateCanvasDocument } from '../../../src/canvas/schema.js'
import type { CanvasDocument } from '../../../src/canvas/types.js'
import { CanvasRenderer } from '../../../src/renderers/CanvasRenderer.js'
import { GenericResultRenderer } from '../../../src/renderers/GenericResultRenderer.js'
import { EmptyState, ErrorState, LoadingState } from '../../../src/renderers/States.js'
import type { ResultBlock } from '../../../src/results/types.js'
import type { WidgetStructuredContent } from '../src/contracts.js'
import { McpAppsBridge } from './bridge/mcpAppsBridge.js'

type ToolInput = { name?: string; arguments?: Record<string, unknown> } | null

type JsonSchemaLike = Record<string, unknown>
type PresetMap = Record<string, Record<string, string>>
type LastRunArgsMap = Record<string, string>

const PRESET_STORAGE_KEY = 'workspace-widget-presets-v1'
const LAST_RUN_STORAGE_KEY = 'workspace-widget-last-run-v1'

function defaultValueForSchema(schema: JsonSchemaLike | undefined): unknown {
  if (!schema || typeof schema !== 'object') return ''
  const t = schema.type
  if (t === 'object') {
    const properties = schema.properties as Record<string, JsonSchemaLike> | undefined
    if (!properties) return {}
    const out: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(properties)) {
      out[key] = defaultValueForSchema(child)
    }
    return out
  }
  if (t === 'array') return []
  if (t === 'number' || t === 'integer') return 0
  if (t === 'boolean') return false
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0]
  return ''
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function toCanvasDocument(value: WidgetStructuredContent | null): CanvasDocument | null {
  if (!value || typeof value !== 'object') return null
  const maybeCanvas = (value as { canvas?: unknown }).canvas
  if (maybeCanvas) {
    const check = validateCanvasDocument(maybeCanvas)
    if (check.ok) return maybeCanvas as CanvasDocument
  }
  if (value.schemaVersion === 'workspace.v1') {
    const mapped = workspaceV1ToCanvas(value)
    const check = validateCanvasDocument(mapped)
    if (check.ok) return mapped
  }
  return null
}

function WidgetApp() {
  const [bridge] = useState(() => new McpAppsBridge())
  const [toolInput, setToolInput] = useState<ToolInput>(null)
  const [structured, setStructured] = useState<WidgetStructuredContent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTool, setSelectedTool] = useState('')
  const [toolArgsText, setToolArgsText] = useState('{}')
  const [toolSearch, setToolSearch] = useState('')
  const [presetName, setPresetName] = useState('default')
  const [selectedPreset, setSelectedPreset] = useState('')
  const [presetsByTool, setPresetsByTool] = useState<PresetMap>({})
  const [lastRunArgsByTool, setLastRunArgsByTool] = useState<LastRunArgsMap>({})
  const [catalogLoading, setCatalogLoading] = useState(false)

  useEffect(() => {
    // Hide static fallback only after React app actually mounts.
    const fallback = document.getElementById('boot-fallback')
    if (fallback) fallback.style.display = 'none'
  }, [])

  useEffect(() => {
    // LAYER A (widget host bridge): hydrate from optional ChatGPT globals first.
    const globals = bridge.getOpenAiGlobals()
    if (globals.toolInput) setToolInput(globals.toolInput as ToolInput)
    if (globals.toolOutput) setStructured(globals.toolOutput as WidgetStructuredContent)
    // Do not auto-call mode=list here.
    // Some hosts remount widgets aggressively and this causes repeated tools/list loops.
    setLoading(false)

    // LAYER B (standard MCP Apps bridge): subscribe to tool-input/result notifications.
    const offResult = bridge.onToolResult((params) => {
      setError(null)
      setStructured((params?.structuredContent ?? null) as WidgetStructuredContent | null)
      setLoading(false)
    })
    const offInput = bridge.onToolInput((params) => {
      setToolInput((params ?? null) as ToolInput)
    })
    return () => {
      offResult()
      offInput()
      bridge.destroy()
    }
  }, [bridge])

  const blocks = useMemo<ResultBlock[]>(() => structured?.blocks ?? [], [structured])
  const canvas = useMemo(() => toCanvasDocument(structured), [structured])
  const availableTools = useMemo(() => structured?.catalog?.tools ?? [], [structured])
  const catalogError = useMemo(() => structured?.catalog?.errorMessage ?? null, [structured])
  const filteredTools = useMemo(() => {
    const q = toolSearch.trim().toLowerCase()
    if (!q) return availableTools
    return availableTools.filter((tool) => {
      const name = tool.name.toLowerCase()
      const description = (tool.description ?? '').toLowerCase()
      return name.includes(q) || description.includes(q)
    })
  }, [availableTools, toolSearch])
  const selectedToolDef = useMemo(
    () => availableTools.find((tool) => tool.name === selectedTool),
    [availableTools, selectedTool],
  )
  const selectedToolPresets = useMemo(
    () => (selectedTool ? presetsByTool[selectedTool] ?? {} : {}),
    [presetsByTool, selectedTool],
  )

  useEffect(() => {
    setPresetsByTool(readJsonStorage<PresetMap>(PRESET_STORAGE_KEY, {}))
    setLastRunArgsByTool(readJsonStorage<LastRunArgsMap>(LAST_RUN_STORAGE_KEY, {}))
  }, [])

  useEffect(() => {
    if (!availableTools.length) return
    if (!selectedTool || !availableTools.some((tool) => tool.name === selectedTool)) {
      setSelectedTool(availableTools[0]?.name ?? '')
    }
  }, [availableTools, selectedTool])

  useEffect(() => {
    if (!filteredTools.length) return
    if (!filteredTools.some((tool) => tool.name === selectedTool)) {
      setSelectedTool(filteredTools[0]?.name ?? '')
    }
  }, [filteredTools, selectedTool])

  async function rerun() {
    const toolName = toolInput?.name
    if (!toolName) return
    setLoading(true)
    setError(null)
    try {
      // Standard bridge request: JSON-RPC tools/call from component.
      await bridge.callTool(toolName, (toolInput?.arguments as Record<string, unknown>) ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to call tool')
      setLoading(false)
    }
  }

  async function runSelectedTool() {
    if (!selectedTool) return
    let parsedArgs: Record<string, unknown> = {}
    try {
      const parsed = JSON.parse(toolArgsText)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Arguments must be a JSON object.')
      }
      parsedArgs = parsed as Record<string, unknown>
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON arguments')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await bridge.callTool('run_workspace_tool', {
        mode: 'run',
        toolName: selectedTool,
        arguments: parsedArgs,
      })
      setLastRunArgsByTool((prev) => {
        const next = { ...prev, [selectedTool]: JSON.stringify(parsedArgs, null, 2) }
        window.localStorage.setItem(LAST_RUN_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to run selected tool')
      setLoading(false)
    }
  }

  async function loadCatalog() {
    setCatalogLoading(true)
    setLoading(true)
    setError(null)
    try {
      await bridge.callTool('run_workspace_tool', { mode: 'list' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tool catalog')
      setLoading(false)
    } finally {
      setCatalogLoading(false)
    }
  }

  function applySchemaTemplate() {
    const schema = selectedToolDef?.inputSchema as JsonSchemaLike | undefined
    if (!schema) {
      setToolArgsText('{}')
      return
    }
    const template = defaultValueForSchema(schema)
    const normalized =
      template && typeof template === 'object' && !Array.isArray(template)
        ? template
        : { value: template }
    setToolArgsText(JSON.stringify(normalized, null, 2))
  }

  function copyArgsFromLastRun() {
    if (!selectedTool) return
    const last = lastRunArgsByTool[selectedTool]
    if (!last) {
      setError('No previous run arguments saved for this tool yet.')
      return
    }
    setError(null)
    setToolArgsText(last)
  }

  function savePreset() {
    if (!selectedTool) return
    const name = presetName.trim()
    if (!name) {
      setError('Preset name is required.')
      return
    }
    setError(null)
    setPresetsByTool((prev) => {
      const toolPresets = prev[selectedTool] ?? {}
      const next: PresetMap = {
        ...prev,
        [selectedTool]: {
          ...toolPresets,
          [name]: toolArgsText,
        },
      }
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setSelectedPreset(name)
  }

  function loadSelectedPreset() {
    if (!selectedTool || !selectedPreset) return
    const txt = presetsByTool[selectedTool]?.[selectedPreset]
    if (!txt) return
    setError(null)
    setToolArgsText(txt)
  }

  function deleteSelectedPreset() {
    if (!selectedTool || !selectedPreset) return
    setPresetsByTool((prev) => {
      const toolPresets = { ...(prev[selectedTool] ?? {}) }
      delete toolPresets[selectedPreset]
      const next: PresetMap = { ...prev, [selectedTool]: toolPresets }
      window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    setSelectedPreset('')
  }

  return (
    <div className="widget-shell">
      <div className="widget-head">
        <strong>{structured?.view?.title ?? 'Workspace widget'}</strong>
        <span className="badge">{structured?.sourceTool ?? 'no tool yet'}</span>
      </div>
      <div className="widget-actions">
        <button type="button" className="btn" onClick={rerun} disabled={!toolInput?.name}>
          Refresh
        </button>
        <button type="button" className="btn" onClick={loadCatalog} disabled={catalogLoading}>
          {catalogLoading ? 'Loading catalog…' : 'Load catalog'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => bridge.sendFollowUpMessage('Please explain this result and propose next steps.')}
        >
          Ask follow-up
        </button>
      </div>
      {availableTools.length ? (
        <div className="state" style={{ marginBottom: 10 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Tool catalog</strong> <span className="muted">({availableTools.length} tools)</span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              value={toolSearch}
              onChange={(e) => setToolSearch(e.target.value)}
              placeholder="Search tools by name or description"
              style={{ background: '#111827', color: '#e8ecf4', border: '1px solid #2a3142', borderRadius: 8, padding: 8 }}
            />
            <select
              value={selectedTool}
              onChange={(e) => setSelectedTool(e.target.value)}
              style={{ background: '#111827', color: '#e8ecf4', border: '1px solid #2a3142', borderRadius: 8, padding: 8 }}
            >
              {filteredTools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>
            {selectedToolDef?.description ? (
              <div className="muted" style={{ fontSize: 12 }}>
                {selectedToolDef.description}
              </div>
            ) : null}
            <textarea
              value={toolArgsText}
              onChange={(e) => setToolArgsText(e.target.value)}
              rows={4}
              style={{ background: '#111827', color: '#e8ecf4', border: '1px solid #2a3142', borderRadius: 8, padding: 8 }}
            />
            <button type="button" className="btn" onClick={applySchemaTemplate} disabled={!selectedTool}>
              Use schema template
            </button>
            <button type="button" className="btn" onClick={copyArgsFromLastRun} disabled={!selectedTool}>
              Copy args from last run
            </button>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="Preset name"
                  style={{
                    flex: 1,
                    background: '#111827',
                    color: '#e8ecf4',
                    border: '1px solid #2a3142',
                    borderRadius: 8,
                    padding: 8,
                  }}
                />
                <button type="button" className="btn" onClick={savePreset} disabled={!selectedTool}>
                  Save preset
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#111827',
                    color: '#e8ecf4',
                    border: '1px solid #2a3142',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <option value="">Select preset</option>
                  {Object.keys(selectedToolPresets).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn" onClick={loadSelectedPreset} disabled={!selectedPreset}>
                  Load preset
                </button>
                <button type="button" className="btn" onClick={deleteSelectedPreset} disabled={!selectedPreset}>
                  Delete preset
                </button>
              </div>
            </div>
            <button type="button" className="btn" onClick={runSelectedTool} disabled={!selectedTool}>
              Run selected tool
            </button>
          </div>
        </div>
      ) : null}
      {!availableTools.length && catalogError ? (
        <ErrorState title="Tool discovery error" message={catalogError} />
      ) : null}

      {/* Required UX states for a complete vertical slice */}
      {loading ? <LoadingState label="Waiting for tool result…" /> : null}
      {error ? <ErrorState title="Widget error" message={error} /> : null}
      {!loading && !error && !structured ? (
        <EmptyState title="No structured result yet" message="Run a curated tool to populate this widget." />
      ) : null}
      {!loading && !error && structured && canvas ? <CanvasRenderer document={canvas} /> : null}
      {!loading && !error && structured && !canvas ? <GenericResultRenderer blocks={blocks} /> : null}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<WidgetApp />)
