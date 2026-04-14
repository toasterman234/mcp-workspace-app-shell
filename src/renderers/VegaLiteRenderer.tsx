import { useEffect, useMemo, useRef, useState } from 'react'
import { validateVegaLiteSpec } from '../canvas/vegaLitePolicy'
import { ErrorState } from './States'
import { JsonViewer } from './JsonViewer'

function toThemedSpec(spec: Record<string, unknown>): Record<string, unknown> {
  const baseConfig = (spec.config as Record<string, unknown> | undefined) ?? {}
  const axisConfig = (baseConfig.axis as Record<string, unknown> | undefined) ?? {}
  const legendConfig = (baseConfig.legend as Record<string, unknown> | undefined) ?? {}
  const titleConfig = (baseConfig.title as Record<string, unknown> | undefined) ?? {}
  const viewConfig = (baseConfig.view as Record<string, unknown> | undefined) ?? {}

  return {
    ...spec,
    background: typeof spec.background === 'string' ? spec.background : '#ffffff',
    config: {
      ...baseConfig,
      axis: {
        labelColor: '#111827',
        titleColor: '#111827',
        tickColor: '#374151',
        domainColor: '#374151',
        ...axisConfig,
      },
      legend: {
        labelColor: '#111827',
        titleColor: '#111827',
        ...legendConfig,
      },
      title: {
        color: '#111827',
        ...titleConfig,
      },
      view: {
        stroke: '#d1d5db',
        ...viewConfig,
      },
    },
  }
}

export function VegaLiteRenderer({ spec }: { spec: Record<string, unknown> }) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const validation = useMemo(() => validateVegaLiteSpec(spec), [spec])
  const themedSpec = useMemo(() => toThemedSpec(spec), [spec])

  useEffect(() => {
    if (!validation.ok) return
    let disposed = false
    let cleanup: (() => void) | undefined

    const render = async () => {
      try {
        setRenderError(null)
        const mod = await import('vega-embed')
        if (disposed || !mountRef.current) return
        const embed = mod.default
        const result = await embed(mountRef.current, themedSpec, {
          actions: false,
          renderer: 'svg',
          tooltip: true,
        })
        cleanup = () => {
          try {
            result?.view?.finalize?.()
          } catch {
            // no-op
          }
        }
      } catch (e) {
        if (!disposed) {
          setRenderError(e instanceof Error ? e.message : 'Failed to render Vega-Lite spec')
        }
      }
    }

    void render()
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [themedSpec, validation.ok])

  if (!validation.ok) {
    return (
      <div className="vega-lite-panel">
        <ErrorState title="Blocked Vega-Lite spec" message={validation.reasons.join('; ')} />
        <JsonViewer value={spec} title="Rejected Vega-Lite spec" />
      </div>
    )
  }

  if (renderError) {
    return (
      <div className="vega-lite-panel">
        <ErrorState title="Vega-Lite render error" message={renderError} />
        <JsonViewer value={spec} title="Vega-Lite spec" />
      </div>
    )
  }

  return (
    <div className="vega-lite-panel">
      <div
        ref={mountRef}
        className="vega-lite-frame"
        style={{
          width: '100%',
          minHeight: 280,
          border: '1px solid #d1d5db',
          borderRadius: 10,
          padding: 8,
          background: '#ffffff',
        }}
      />
    </div>
  )
}

