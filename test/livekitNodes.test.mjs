import assert from 'node:assert/strict'
import test from 'node:test'
import { parseLivekitNodeDescriptors } from '../utils/livekitNodes.mjs'

test('preserves configured node ids and metrics ports', () => {
  const nodes = parseLivekitNodeDescriptors(
    '[{"id":"node-a","prometheus_port":6789},{"id":"node-b","prometheus_port":6790}]'
  )

  assert.deepEqual(nodes, [
    { id: 'node-a', prometheusPort: 6789 },
    { id: 'node-b', prometheusPort: 6790 },
  ])
})

test('rejects empty, duplicate, and unsafe node registries', () => {
  assert.throws(() => parseLivekitNodeDescriptors('[]'))
  assert.throws(() =>
    parseLivekitNodeDescriptors(
      '[{"id":"node-a","prometheus_port":6789},{"id":"node-a","prometheus_port":6790}]'
    )
  )
  assert.throws(() => parseLivekitNodeDescriptors('[{"id":"Bad_Node","prometheus_port":6789}]'))
  assert.throws(() => parseLivekitNodeDescriptors('[{"id":"redis-node","prometheus_port":6789}]'))
  assert.throws(() => parseLivekitNodeDescriptors('[{"id":"server-node","prometheus_port":6789}]'))
  assert.throws(() => parseLivekitNodeDescriptors('[{"id":"node-a","prometheus_port":9001}]'))
})
