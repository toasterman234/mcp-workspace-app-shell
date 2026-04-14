import assert from 'node:assert/strict'
import { workspaceV1ToCanvas } from '../src/canvas/compat.js'
import { validateCanvasDocument } from '../src/canvas/schema.js'
import { validateVegaLiteSpec } from '../src/canvas/vegaLitePolicy.js'
import type { WorkspaceV1Document } from '../src/canvas/types.js'

function testWorkspaceToCanvasMapper() {
  const input: WorkspaceV1Document = {
    schemaVersion: 'workspace.v1',
    view: { id: 'overview', title: 'Overview' },
    requestedTool: 'run_workspace_tool',
    sourceTool: 'tradier-get_user_profile',
    blocks: [
      {
        id: 'json_1',
        kind: 'json',
        title: 'Profile',
        raw: { name: 'Ben' },
      },
    ],
    raw: { name: 'Ben' },
  }

  const canvas = workspaceV1ToCanvas(input)
  assert.equal(canvas.schemaVersion, 'canvas.v1')
  assert.equal(canvas.view.id, 'overview')
  assert.equal(canvas.blocks.length, 1)
  assert.deepEqual(canvas.blocks[0], input.blocks[0])
}

function testCanvasValidatorAcceptsValidDocument() {
  const good = {
    schemaVersion: 'canvas.v1',
    view: { id: 'overview', title: 'Overview' },
    blocks: [{ id: 'json_1', kind: 'json', raw: { hello: 'world' } }],
  }
  const result = validateCanvasDocument(good)
  assert.equal(result.ok, true, `expected valid canvas document, got errors: ${result.errors.join('; ')}`)
}

function testCanvasValidatorRejectsInvalidDocument() {
  const bad = {
    schemaVersion: 'canvas.v0',
    view: { id: '', title: 42 },
    blocks: [{ id: '', kind: 'unknown' }],
  }
  const result = validateCanvasDocument(bad)
  assert.equal(result.ok, false)
  assert.ok(result.errors.length > 0)
}

function testVegaLitePolicy() {
  const allowed = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { values: [{ x: 1, y: 2 }] },
    mark: 'line',
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
  }
  const good = validateVegaLiteSpec(allowed)
  assert.equal(good.ok, true, `expected allowed spec to pass, got: ${good.reasons.join('; ')}`)

  const blocked = {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    data: { url: 'https://example.com/data.json' },
    mark: 'line',
  }
  const bad = validateVegaLiteSpec(blocked)
  assert.equal(bad.ok, false, 'expected URL-backed spec to be blocked')
  assert.ok(bad.reasons.some((r) => r.includes('remote/URL data source')))
}

function run() {
  testWorkspaceToCanvasMapper()
  testCanvasValidatorAcceptsValidDocument()
  testCanvasValidatorRejectsInvalidDocument()
  testVegaLitePolicy()
  // eslint-disable-next-line no-console
  console.log('[canvas-contract-test] all checks passed')
}

run()

