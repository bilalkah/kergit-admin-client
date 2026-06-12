const NODE_ID_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const RESERVED_NODE_IDS = new Set([
  'admin-node',
  'server-node',
  'caddy-node',
  'redis-node',
  'web-node',
  'web-node-dev',
  'web-node-prod',
])
const RESERVED_HOST_TCP_PORTS = new Set([80, 443, 3000, 3001, 6379, 8080, 8081, 9001])

export const parseLivekitNodeDescriptors = (raw) => {
  if (!raw) throw new Error('LIVEKIT_NODES is required')

  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('LIVEKIT_NODES must be a non-empty JSON array')
  }

  const ids = new Set()
  return parsed.map((node) => {
    if (
      typeof node !== 'object' ||
      node === null ||
      typeof node.id !== 'string' ||
      !NODE_ID_RE.test(node.id) ||
      !Number.isInteger(node.prometheus_port) ||
      node.prometheus_port < 1 ||
      node.prometheus_port > 65535
    ) {
      throw new Error('LIVEKIT_NODES entries require a safe id and valid prometheus_port')
    }
    if (RESERVED_NODE_IDS.has(node.id)) {
      throw new Error(`LIVEKIT_NODES node id '${node.id}' collides with a shared service`)
    }
    if (RESERVED_HOST_TCP_PORTS.has(node.prometheus_port)) {
      throw new Error(`LIVEKIT_NODES TCP port ${node.prometheus_port} collides with a shared service`)
    }
    if (ids.has(node.id)) throw new Error(`LIVEKIT_NODES contains duplicate node id '${node.id}'`)
    if ([...ids].some((id) => node.id.startsWith(id) || id.startsWith(node.id))) {
      throw new Error('LIVEKIT_NODES node ids must not be path prefixes')
    }
    ids.add(node.id)
    return { id: node.id, prometheusPort: node.prometheus_port }
  })
}
