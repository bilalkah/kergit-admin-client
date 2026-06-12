import { defineStore, storeToRefs } from 'pinia'
import { fetchTimeseries } from '@/api/metrics'
import type { MetricsTimeseriesV1 } from '@/models/metrics'

const useMetricsStore = defineStore('metrics', () => {
  const data = ref<MetricsTimeseriesV1 | null>(null)
  const error = ref<string | null>(null)
  const lastUpdated = ref<number | null>(null)
  const polling = ref(false)
  let timer: ReturnType<typeof setInterval> | null = null

  const refresh = async (windowSec = 60) => {
    try {
      const payload = await fetchTimeseries(windowSec)
      data.value = payload
      error.value = null
      lastUpdated.value = Date.now()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Metrics fetch failed'
      error.value = message
    }
  }

  const start = (windowSec = 60) => {
    if (polling.value) return
    polling.value = true
    refresh(windowSec)
    timer = setInterval(() => {
      refresh(windowSec)
    }, 1000)
  }

  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
  }

  return {
    data,
    error,
    lastUpdated,
    polling,
    refresh,
    start,
    stop,
  }
})

export const useMetrics = (windowSec = 60) => {
  const store = useMetricsStore()
  if (import.meta.client) {
    onMounted(() => store.start(windowSec))
    onBeforeUnmount(() => store.stop())
  }
  return {
    ...storeToRefs(store),
    refresh: store.refresh,
  }
}
