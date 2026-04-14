import type { NormalizedToolResult } from '../mcp/normalize/types'
import { resultBlocksFromNormalized } from '../results/fromNormalized'
import { GenericResultRenderer } from './GenericResultRenderer'

/** Unknown / exploratory tool output — shows hint + generic result blocks. */
export function ToolResultCard({
  toolName,
  block,
}: {
  toolName: string
  block: NormalizedToolResult
}) {
  const blocks = resultBlocksFromNormalized(toolName, [block])
  return (
    <div className="tool-card">
      <div className="tool-card-head">
        <span className="tool-name">{toolName}</span>
        <span className="tool-hint">{block.hint}</span>
      </div>
      <GenericResultRenderer blocks={blocks} />
    </div>
  )
}
