import type { CanvasDocument, WorkspaceV1Document } from './types'

/**
 * Workspace contract compatibility bridge.
 * Phase 1: passthrough block mapping to bootstrap canvas renderer rollout.
 */
export function workspaceV1ToCanvas(doc: WorkspaceV1Document): CanvasDocument {
  return {
    schemaVersion: 'canvas.v1',
    view: {
      id: doc.view.id,
      title: doc.view.title,
      description: doc.view.description,
    },
    blocks: doc.blocks,
    raw: doc.raw,
    errors: [],
  }
}

