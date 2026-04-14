import type { CanvasDocument } from './types'

export interface CanvasValidationResult {
  ok: boolean
  errors: string[]
}

const SUPPORTED_BLOCK_KINDS = new Set([
  'table',
  'series',
  'kpis',
  'rankedList',
  'metricGroups',
  'events',
  'filters',
  'json',
  'vega_lite',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateBlock(block: unknown, index: number): string[] {
  const errors: string[] = []
  if (!isRecord(block)) {
    errors.push(`blocks[${index}] must be an object`)
    return errors
  }
  if (typeof block.id !== 'string' || !block.id.trim()) {
    errors.push(`blocks[${index}].id must be a non-empty string`)
  }
  if (typeof block.kind !== 'string' || !SUPPORTED_BLOCK_KINDS.has(block.kind)) {
    errors.push(`blocks[${index}].kind must be one of ${[...SUPPORTED_BLOCK_KINDS].join(', ')}`)
    return errors
  }
  switch (block.kind) {
    case 'table':
      if (!isRecord(block.table)) errors.push(`blocks[${index}].table must be an object`)
      break
    case 'series':
      if (!isRecord(block.chart)) errors.push(`blocks[${index}].chart must be an object`)
      break
    case 'kpis':
      if (!Array.isArray(block.kpis)) errors.push(`blocks[${index}].kpis must be an array`)
      break
    case 'rankedList':
      if (!isRecord(block.ranked)) errors.push(`blocks[${index}].ranked must be an object`)
      break
    case 'metricGroups':
      if (!Array.isArray(block.groups)) errors.push(`blocks[${index}].groups must be an array`)
      break
    case 'events':
      if (!Array.isArray(block.events)) errors.push(`blocks[${index}].events must be an array`)
      break
    case 'filters':
      if (!Array.isArray(block.filters)) errors.push(`blocks[${index}].filters must be an array`)
      break
    case 'json':
      if (!Object.prototype.hasOwnProperty.call(block, 'raw')) errors.push(`blocks[${index}].raw is required`)
      break
    case 'vega_lite':
      if (!isRecord(block.spec)) errors.push(`blocks[${index}].spec must be an object`)
      break
    default:
      break
  }
  return errors
}

export function validateCanvasDocument(value: unknown): CanvasValidationResult {
  const errors: string[] = []
  if (!isRecord(value)) return { ok: false, errors: ['canvas document must be an object'] }
  if (value.schemaVersion !== 'canvas.v1') errors.push('schemaVersion must equal "canvas.v1"')

  if (!isRecord(value.view)) {
    errors.push('view must be an object')
  } else {
    if (typeof value.view.id !== 'string' || !value.view.id.trim()) errors.push('view.id must be a non-empty string')
    if (typeof value.view.title !== 'string' || !value.view.title.trim())
      errors.push('view.title must be a non-empty string')
    if (value.view.description != null && typeof value.view.description !== 'string')
      errors.push('view.description must be a string when provided')
  }

  if (!Array.isArray(value.blocks)) {
    errors.push('blocks must be an array')
  } else {
    for (let i = 0; i < value.blocks.length; i++) errors.push(...validateBlock(value.blocks[i], i))
  }

  if (value.errors != null && !Array.isArray(value.errors)) errors.push('errors must be an array when provided')

  return { ok: errors.length === 0, errors }
}

export function assertCanvasDocument(value: unknown): asserts value is CanvasDocument {
  const result = validateCanvasDocument(value)
  if (!result.ok) {
    throw new Error(`Invalid canvas document: ${result.errors.join('; ')}`)
  }
}

