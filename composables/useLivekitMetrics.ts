import { defineStore, storeToRefs } from 'pinia'
import { fetchLivekitMetrics } from '@/api/livekitMetrics'
import { deriveLivekitHighlights, parsePrometheusSamples, type LivekitHighlight, type PromSample } from '@/models/prometheus'

export type NodeMetrics = {
  id: string
  port: string
  status: 'up' | 'down'
  error?: string
  highlights: LivekitHighlight[]
  samples: PromSample[]
}

const useLivekitMetricsStore = defineStore('livekitMetrics', () => {
  const nodeMetrics = ref<NodeMetrics[]>([])
  const selectedNodeId = ref<string | null>(null)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number | null>(null)
  const polling = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const refresh = async () => {
    try {
      const config = useRuntimeConfig()
      const configuredNodes = config.public.livekitNodes || []
      const livekitBaseRaw = (config.public.adminLivekitMetricsBase || '/admin-livekit-metrics').trim()
      const livekitBase = livekitBaseRaw.endsWith('/')
        ? livekitBaseRaw.slice(0, -1)
        : livekitBaseRaw

      if (configuredNodes.length === 0) {
        error.value = 'No LiveKit nodes configured'
        return
      }

      const targets = configuredNodes.map((node: { id: string; prometheusPort: number }) => ({
        id: node.id,
        url: `${livekitBase}/${node.id}`,
        port: String(node.prometheusPort),
      }))

      const results = await fetchLivekitMetrics(
        targets.map((target) => ({ id: target.id, url: target.url }))
      )

      const nodeMetricsArray: NodeMetrics[] = targets.map((target) => {
        const res = results.find((item) => item.id === target.id)
        if (!res || res.error || !res.raw) {
          return {
            id: target.id,
            port: target.port,
            status: 'down' as const,
            error: res?.error ?? 'unreachable',
            highlights: [],
            samples: [],
          }
        }

        const samples = parsePrometheusSamples(res.raw, target.id)
        const highlights = deriveLivekitHighlights(samples)

        return {
          id: target.id,
          port: target.port,
          status: 'up' as const,
          highlights,
          samples,
        }
      })

      nodeMetrics.value = nodeMetricsArray

      // Auto-select first node if none selected
      if (!selectedNodeId.value && nodeMetricsArray.length > 0) {
        selectedNodeId.value = nodeMetricsArray[0].id
      }

      const allFailed = results.every((result) => !result.raw)
      error.value = allFailed ? 'LiveKit metrics unavailable' : null
      lastUpdated.value = Date.now()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LiveKit metrics fetch failed'
      error.value = message
    }
  }

  const selectedNode = computed(() => {
    if (!selectedNodeId.value) return null
    return nodeMetrics.value.find((node) => node.id === selectedNodeId.value) ?? null
  })

  const selectNode = (nodeId: string) => {
    selectedNodeId.value = nodeId
  }

  const start = (intervalMs = 5000) => {
    if (polling.value) return
    polling.value = true
    refresh()
    timer = setInterval(() => {
      refresh()
    }, intervalMs)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
  }

  return {
    nodeMetrics,
    selectedNodeId,
    selectedNode,
    error,
    lastUpdated,
    polling,
    refresh,
    selectNode,
    start,
    stop,
  }
})

export const useLivekitMetrics = (intervalMs = 5000) => {
  const store = useLivekitMetricsStore()
  if (import.meta.client) {
    onMounted(() => store.start(intervalMs))
    onBeforeUnmount(() => store.stop())
  }
  return {
    ...storeToRefs(store),
    selectNode: store.selectNode,
  }
}
