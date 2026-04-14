import type { ResultBlock } from '../results/types'
import { CanvasRenderer } from './CanvasRenderer'

export function GenericResultRenderer({ blocks }: { blocks: ResultBlock[] }) {
  if (!blocks.length) return null
  return (
    <CanvasRenderer
      document={{
        schemaVersion: 'canvas.v1',
        view: { id: 'legacy-generic', title: 'Result' },
        blocks,
        errors: [],
      }}
    />
  )
}
