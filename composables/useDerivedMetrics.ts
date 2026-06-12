import type { MetricsSnapshotV1, MetricsTimeseriesV1 } from '@/models/metrics'
import type { Ref } from 'vue'

const toRateSeries = (
  samples: MetricsSnapshotV1[],
  getter: (sample: MetricsSnapshotV1) => number
): number[] => {
  if (samples.length < 2) return []
  const rates: number[] = []
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1]
    const curr = samples[i]
    const delta = getter(curr) - getter(prev)
    const dt = Math.max(curr.ts - prev.ts, 1)
    rates.push(delta / dt)
  }
  return rates
}

export const useDerivedMetrics = (series: Ref<MetricsTimeseriesV1 | null>) => {
  const samples = computed(() => series.value?.samples ?? [])

  const inboundRate = computed(() =>
    toRateSeries(samples.value, (s) => s.counters.inbound_total)
  )
  const outboundRate = computed(() =>
    toRateSeries(samples.value, (s) => s.counters.outbound_total)
  )
  const backpressureRate = computed(() =>
    toRateSeries(samples.value, (s) => s.counters.outbound_backpressured_total)
  )
  const dropRate = computed(() =>
    toRateSeries(
      samples.value,
      (s) => s.counters.dropped_out + s.counters.dropped_in
    )
  )

  const latest = computed<MetricsSnapshotV1 | null>(() => {
    const list = samples.value
    return list.length ? list[list.length - 1] : null
  })

  const outboundTickHistDelta = computed(() => {
    const list = samples.value
    if (!list.length) return []
    if (list.length === 1) return list[0].histograms.outbound_tick_hist
    const prev = list[list.length - 2].histograms.outbound_tick_hist
    const curr = list[list.length - 1].histograms.outbound_tick_hist
    return curr.map((val, idx) => Math.max(val - (prev[idx] ?? 0), 0))
  })

  const latestRate = (rateSeries: number[]) =>
    rateSeries.length ? rateSeries[rateSeries.length - 1] : 0

  return {
    samples,
    latest,
    inboundRate,
    outboundRate,
    backpressureRate,
    dropRate,
    latestInboundRate: computed(() => latestRate(inboundRate.value)),
    latestOutboundRate: computed(() => latestRate(outboundRate.value)),
    latestBackpressureRate: computed(() => latestRate(backpressureRate.value)),
    latestDropRate: computed(() => latestRate(dropRate.value)),
    outboundTickHistDelta,
  }
}
