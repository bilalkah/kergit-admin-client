<template>
  <section class="dashboard">
    <div class="dashboard__health">
      <div class="health__title">
        <div>
          <h1>Cluster Health</h1>
          <p>Operators view of live signals and derived rates.</p>
        </div>
        <div class="dashboard__status">
          <div v-if="error" class="status status--error">{{ error }}</div>
          <div v-else class="status">Updated: {{ lastUpdatedLabel }}</div>
        </div>
      </div>
      <div class="health__cards">
        <MetricCard label="Active Connections" :value="latest?.gauges.active_connections ?? 0" />
        <MetricCard label="Active Users" :value="latest?.gauges.active_users ?? 0" />
        <MetricCard label="Client Ping Avg (ms)" :value="latest?.gauges.client_rtt_avg_ms ?? 0" />
        <MetricCard label="Client Ping Max (ms)" :value="latest?.gauges.client_rtt_max_ms ?? 0" />
        <MetricCard label="Inbound / sec" :value="formatRate(latestInboundRate)" />
        <MetricCard label="Outbound / sec" :value="formatRate(latestOutboundRate)" />
      </div>
    </div>

    <div class="dashboard__content">
      <section class="section" v-if="connectionsByPort.length > 0">
        <h2>Connection Distribution</h2>
        <div class="health__cards">
          <MetricCard v-for="(count, index) in connectionsByPort" :key="`port-${index}`"
            :label="`Port ${getPortNumber(index)}`" :value="count" :meta="`${getPortPercentage(count)}%`" />
        </div>
      </section>

      <section class="section">
        <h2>Client Latency</h2>
        <MultiLineChart label="WebSocket RTT" :series="clientRttSeries" :width="960" :height="220" />
      </section>

      <section class="section">
        <h2>Worker Performance</h2>
        <div class="health__cards">
          <MetricCard label="Worker Utilization" :value="`${latest?.gauges.worker_utilization_pct ?? 0}%`"
            :meta="`${latest?.gauges.active_workers ?? 0} / ${latest?.gauges.total_workers ?? 0} active`" />
          <MetricCard label="Queue Depth" :value="latest?.gauges.current_queue_depth ?? 0" meta="events pending" />
          <MetricCard label="Commands Processed" :value="formatNumber(latest?.counters.inbound_total ?? 0)"
            meta="total" />
          <MetricCard label="Throughput" :value="`${formatRate(latestInboundRate)}/s`" meta="commands/sec" />
        </div>
        <MultiLineChart label="Worker Utilization & Queue Depth" :series="workerSeries" :width="960" :height="220" />
      </section>

      <section class="section" v-if="topCommands.length > 0">
        <h2>Command Execution Time</h2>
        <div class="commands-grid">
          <div v-for="cmd in topCommands" :key="cmd.type" class="command-card">
            <div class="command-card__header">
              <span class="command-card__type">{{ cmd.name || `Type ${cmd.type}` }}</span>
              <span class="command-card__count">{{ formatNumber(cmd.count) }} executions</span>
            </div>
            <div class="command-card__metrics">
              <div class="command-card__metric">
                <span class="label">Avg</span>
                <span class="value">{{ formatDuration(cmd.avg_us) }}</span>
              </div>
              <div class="command-card__metric">
                <span class="label">Max</span>
                <span class="value">{{ formatDuration(cmd.max_us) }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Traffic</h2>
        <MultiLineChart label="Inbound vs Outbound" :series="trafficSeries" :width="960" :height="220" />
      </section>

      <section class="section">
        <h2>Backpressure & Drops</h2>
        <MultiLineChart label="Backpressure + Drops" :series="backpressureSeries" :width="960" :height="220" />
      </section>

      <section class="section">
        <h2>Queues & High-Water Marks</h2>
        <MultiLineChart label="Queue High-Water" :series="queueSeries" :width="960" :height="220" />
        <HistogramBars label="Outbound Tick Histogram" :buckets="outboundTickHistDelta" />
      </section>

      <section class="section">
        <div class="section__header">
          <h2>LiveKit Prometheus Metrics</h2>
          <div class="dashboard__status">
            <div v-if="livekitError" class="status status--error">{{ livekitError }}</div>
            <div v-else class="status">Updated: {{ livekitUpdatedLabel }}</div>
          </div>
        </div>
        <div class="livekit-panel">
          <div class="livekit-panel__meta">
            <span>Sources: {{ livekitSourceLabel }}</span>
            <div class="livekit-nodes">
              <button v-for="node in nodeMetrics" :key="node.id" class="node-pill" :class="{
                'node-pill--up': node.status === 'up',
                'node-pill--down': node.status === 'down',
                'node-pill--selected': selectedNodeId === node.id
              }" @click="selectNode(node.id)">
                {{ node.id }} {{ node.status }}
              </button>
            </div>
          </div>

          <div v-if="selectedNode && selectedNode.status === 'up'">
            <h3 class="livekit-section-title">Connection Stages</h3>
            <div class="livekit-highlights">
              <MetricCard v-for="item in livekitConnectionMetrics" :key="item.key" :label="item.label"
                :value="item.value" :meta="item.meta" />
            </div>

            <h3 class="livekit-section-title">Room & Track Stats</h3>
            <div class="livekit-highlights">
              <MetricCard v-for="item in livekitRoomTrackMetrics" :key="item.key" :label="item.label"
                :value="item.value" :meta="item.meta" />
            </div>

            <h3 class="livekit-section-title">Node Scope</h3>
            <div class="livekit-highlights">
              <MetricCard v-for="item in livekitNodeScopeMetrics" :key="item.key" :label="item.label"
                :value="item.value" :meta="item.meta" />
            </div>

            <h3 class="livekit-section-title">Node Load</h3>
            <div class="livekit-highlights">
              <MetricCard v-for="item in livekitLoadMetrics" :key="item.key" :label="item.label" :value="item.value"
                :meta="item.meta" />
            </div>
          </div>

          <div v-else-if="selectedNode && selectedNode.status === 'down'" class="livekit-empty">
            Node {{ selectedNode.id }} is down: {{ selectedNode.error }}
          </div>

          <div v-else class="livekit-empty">No LiveKit metrics available.</div>
        </div>
      </section>

      <section class="section">
        <h2>Metric Semantics</h2>
        <div class="metrics-grid">
          <MetricDocCard v-for="doc in metricDocs" :key="doc.key" :label="doc.label" :value="doc.value"
            :meaning="doc.meaning" :expected="doc.expected" :warning="doc.warning" :danger="doc.danger"
            :causes="doc.causes" :action="doc.action" />
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import MetricCard from '@/components/MetricCard.vue'
import MetricDocCard from '@/components/MetricDocCard.vue'
import MultiLineChart from '@/components/MultiLineChart.vue'
import HistogramBars from '@/components/HistogramBars.vue'
import { useMetrics } from '@/composables/useMetrics'
import { useDerivedMetrics } from '@/composables/useDerivedMetrics'
import { useLivekitMetrics } from '@/composables/useLivekitMetrics'

const { data, error, lastUpdated } = useMetrics(60)
const {
  nodeMetrics,
  selectedNode,
  selectedNodeId,
  error: livekitError,
  lastUpdated: livekitUpdated,
  selectNode,
} = useLivekitMetrics(5000)
const {
  latest,
  inboundRate,
  outboundRate,
  backpressureRate,
  dropRate,
  latestInboundRate,
  latestOutboundRate,
  outboundTickHistDelta,
} = useDerivedMetrics(data)

const formatRate = (value: number) => value.toFixed(2)

const formatNumber = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

const formatDuration = (microseconds: number) => {
  if (microseconds >= 1000000) return `${(microseconds / 1000000).toFixed(2)}s`
  if (microseconds >= 1000) return `${(microseconds / 1000).toFixed(2)}ms`
  return `${microseconds}μs`
}

const trafficSeries = computed(() => [
  { name: 'Inbound / sec', values: inboundRate.value, color: '#00D1FF' },
  { name: 'Outbound / sec', values: outboundRate.value, color: '#FFB020' },
])

const backpressureSeries = computed(() => [
  { name: 'Backpressure / sec', values: backpressureRate.value, color: '#0ea5e9' },
  {
    name: 'Slow Conn Dropped (total)',
    values: (data.value?.samples ?? []).map((s) => s.counters.slow_connection_dropped_total),
    color: '#ef4444',
  },
  {
    name: 'Dropped Out (total)',
    values: (data.value?.samples ?? []).map((s) => s.counters.dropped_out),
    color: '#22c55e',
  },
  { name: 'Drops / sec', values: dropRate.value, color: '#a855f7' },
])

const queueSeries = computed(() => [
  {
    name: 'Event Hi-Water',
    values: (data.value?.samples ?? []).map((s) => s.gauges.event_hiwat),
    color: '#9D4EDD',
  },
  {
    name: 'Outbound Hi-Water',
    values: (data.value?.samples ?? []).map((s) => s.gauges.outbound_hiwat),
    color: '#2EC4B6',
  },
])

const clientRttSeries = computed(() => [
  {
    name: 'Avg RTT (ms)',
    values: (data.value?.samples ?? []).map((s) => s.gauges.client_rtt_avg_ms),
    color: '#10b981',
  },
  {
    name: 'Max RTT (ms)',
    values: (data.value?.samples ?? []).map((s) => s.gauges.client_rtt_max_ms),
    color: '#f59e0b',
  },
])

const workerSeries = computed(() => [
  {
    name: 'Utilization %',
    values: (data.value?.samples ?? []).map((s) => s.gauges.worker_utilization_pct),
    color: '#8b5cf6',
  },
  {
    name: 'Queue Depth',
    values: (data.value?.samples ?? []).map((s) => s.gauges.current_queue_depth),
    color: '#ec4899',
  },
])

const topCommands = computed(() => {
  const timings = latest.value?.command_timings ?? []
  // Sort by count descending and take top 10
  return [...timings]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
})

const connectionsByPort = computed(() => {
  return latest.value?.gauges.connections_by_port?.filter(c => c > 0) ?? []
})

// Get the port number from the .env file
const getPortNumber = (index: number) => {
  // Default ports starting from 9001
  return 9001 + index
}

const getPortPercentage = (count: number) => {
  const total = latest.value?.gauges.active_connections ?? 0
  if (total === 0) return '0'
  return ((count / total) * 100).toFixed(1)
}

const lastUpdatedLabel = computed(() => {
  if (!lastUpdated.value) return 'waiting'
  return new Date(lastUpdated.value).toLocaleTimeString()
})

const livekitUpdatedLabel = computed(() => {
  if (!livekitUpdated.value) return 'waiting'
  return new Date(livekitUpdated.value).toLocaleTimeString()
})

const livekitSourceLabel = computed(() => {
  if (!nodeMetrics.value.length) return 'No sources'
  return nodeMetrics.value.map((node) => `${node.id} :${node.port}/metrics`).join(' • ')
})

const livekitHighlights = computed(() => {
  return selectedNode.value?.highlights ?? []
})

const filterLivekitHighlights = (keys: string[]) =>
  livekitHighlights.value.filter((highlight) => keys.includes(highlight.key))

const livekitConnectionMetrics = computed(() => {
  return filterLivekitHighlights([
    'participant_signal_connected',
    'participant_rtc_init',
    'participant_rtc_connected',
    'udp_connections',
    'failed_connections',
    // Backward compatibility in case an old payload shape is present.
    'participant_joined',
    'participant_connected',
  ])
})

const livekitRoomTrackMetrics = computed(() => {
  return filterLivekitHighlights([
    'rooms',
    'participants',
    'tracks',
    'published_tracks',
    'subscribed_tracks',
    'latency',
  ])
})

const livekitNodeScopeMetrics = computed(() => {
  return filterLivekitHighlights(['exporter_node_id'])
})

const livekitLoadMetrics = computed(() => {
  if (!selectedNode.value || selectedNode.value.status !== 'up') return []

  const cpuMetric = selectedNode.value.highlights.find(h => h.key === 'cpu_time')
  const memMetric = selectedNode.value.highlights.find(h => h.key === 'memory')
  const packetsIn = selectedNode.value.highlights.find(h => h.key === 'packet_in')
  const packetsOut = selectedNode.value.highlights.find(h => h.key === 'packet_out')
  const nodeMessages = selectedNode.value.highlights.find(h => h.key === 'node_messages')

  return [
    cpuMetric,
    memMetric,
    packetsIn,
    packetsOut,
    nodeMessages,
  ].filter(Boolean)
})

const metricDocs = computed(() => {
  const snap = latest.value
  const counter = snap?.counters
  const gauges = snap?.gauges
  const hist = snap?.histograms

  const docs = [
    {
      key: 'inbound_total',
      label: 'inbound_total',
      value: counter?.inbound_total ?? 0,
      meaning: 'Total inbound messages accepted by the server',
      expected: 'Monotonic increase',
      warning: 'Sudden spikes above normal workload',
      danger: 'Sustained high growth without matching outbound',
      causes: 'Traffic burst, retries, or client flood',
      action: 'Compare outbound/sec and drop rates',
    },
    {
      key: 'outbound_total',
      label: 'outbound_total',
      value: counter?.outbound_total ?? 0,
      meaning: 'Total outbound messages queued for delivery',
      expected: 'Tracks inbound workload',
      warning: 'Lagging behind inbound',
      danger: 'Flatline while inbound grows',
      causes: 'Outbound backpressure or routing failures',
      action: 'Check backpressure/sec and slow drops',
    },
    {
      key: 'parse_fail',
      label: 'parse_fail',
      value: counter?.parse_fail ?? 0,
      meaning: 'Failed envelope parses',
      expected: '0',
      warning: 'Occasional spikes during malformed traffic',
      danger: 'Sustained increases',
      causes: 'Protocol mismatch or client bugs',
      action: 'Validate client versions and envelopes',
    },
    {
      key: 'auth_fail',
      label: 'auth_fail',
      value: counter?.auth_fail ?? 0,
      meaning: 'Authentication failures',
      expected: 'Low single digits',
      warning: 'Bursts during login storms',
      danger: 'Sustained growth',
      causes: 'Expired tokens or auth outage',
      action: 'Inspect auth pipeline and token TTL',
    },
    {
      key: 'membership_fail',
      label: 'membership_fail',
      value: counter?.membership_fail ?? 0,
      meaning: 'Membership validation failures',
      expected: '0',
      warning: 'Occasional unauthorized attempts',
      danger: 'Persistent growth',
      causes: 'Client bugs or authorization regressions',
      action: 'Review membership checks',
    },
    {
      key: 'payload_parse_total',
      label: 'payload_parse_total',
      value: counter?.payload_parse_total ?? 0,
      meaning: 'Total payload parses',
      expected: '≈ inbound_total',
      warning: 'Lagging or unexpectedly low',
      danger: 'Flatline while inbound continues',
      causes: 'Parser short-circuit or malformed payloads',
      action: 'Check payload_parse_fail_total',
    },
    {
      key: 'payload_parse_fail_total',
      label: 'payload_parse_fail_total',
      value: counter?.payload_parse_fail_total ?? 0,
      meaning: 'Failed payload parses',
      expected: '0',
      warning: 'Occasional spikes during rollout',
      danger: 'Sustained errors',
      causes: 'Schema mismatch or corrupted frames',
      action: 'Validate command schemas and clients',
    },
    {
      key: 'parsed_payload_violation_total',
      label: 'parsed_payload_violation_total',
      value: counter?.parsed_payload_violation_total ?? 0,
      meaning: 'Internal invariant violations for parsed payloads',
      expected: '0',
      warning: 'Any non-zero value',
      danger: 'Any non-zero value',
      causes: 'Command dispatch bug',
      action: 'Inspect latest deployments and command mapping',
    },
    {
      key: 'registry_view_access_total',
      label: 'registry_view_access_total',
      value: counter?.registry_view_access_total ?? 0,
      meaning: 'Connection registry view accesses',
      expected: 'Tracks outbound workload',
      warning: 'Drops relative to outbound_total',
      danger: 'Flatline while outbound continues',
      causes: 'Registry access failures',
      action: 'Check registry_miss_total',
    },
    {
      key: 'registry_miss_total',
      label: 'registry_miss_total',
      value: counter?.registry_miss_total ?? 0,
      meaning: 'Outbound lookup misses in registry',
      expected: 'Near 0',
      warning: 'Spikes during churn',
      danger: 'Sustained increase',
      causes: 'Disconnect storms',
      action: 'Inspect connection lifecycle',
    },
    {
      key: 'registry_copy_elim_total',
      label: 'registry_copy_elim_total',
      value: counter?.registry_copy_elim_total ?? 0,
      meaning: 'Outbound messages processed without copying ConnectionContext',
      expected: '≈ outbound_total',
      warning: 'Lagging behind outbound_total',
      danger: 'Flatline while outbound continues',
      causes: 'Unexpected code path regression',
      action: 'Audit outbound path changes',
    },
    {
      key: 'fanout_sub_snapshot_total',
      label: 'fanout_sub_snapshot_total',
      value: counter?.fanout_sub_snapshot_total ?? 0,
      meaning: 'Broadcasts using subscriber snapshots',
      expected: 'Tracks fan-out usage',
      warning: 'Unexpected drop',
      danger: '0 during active fan-out',
      causes: 'Subscription manager regression',
      action: 'Validate subscriptions',
    },
    {
      key: 'fanout_payload_shared_total',
      label: 'fanout_payload_shared_total',
      value: counter?.fanout_payload_shared_total ?? 0,
      meaning: 'Fan-out payloads shared across recipients',
      expected: 'Matches fan-out volume',
      warning: 'Lagging behind fan-out',
      danger: '0 under fan-out load',
      causes: 'Payload sharing disabled',
      action: 'Check fan-out path',
    },
    {
      key: 'per_conn_enqueued_total',
      label: 'per_conn_enqueued_total',
      value: counter?.per_conn_enqueued_total ?? 0,
      meaning: 'Messages enqueued into per-connection outboxes',
      expected: '≈ outbound_total',
      warning: 'Drop vs outbound_total',
      danger: 'Flatline while outbound rises',
      causes: 'Queue overflow',
      action: 'Inspect per-conn overflow and slow drops',
    },
    {
      key: 'per_conn_dropped_low_total',
      label: 'per_conn_dropped_low_total',
      value: counter?.per_conn_dropped_low_total ?? 0,
      meaning: 'Low-priority messages dropped in per-conn queue',
      expected: '0 or low',
      warning: 'Spikes during bursts',
      danger: 'Sustained growth',
      causes: 'Slow clients or overload',
      action: 'Check slow_connection_dropped_total',
    },
    {
      key: 'per_conn_overflow_total',
      label: 'per_conn_overflow_total',
      value: counter?.per_conn_overflow_total ?? 0,
      meaning: 'Per-connection queue overflow occurrences',
      expected: '0',
      warning: 'Sporadic during spikes',
      danger: 'Sustained growth',
      causes: 'Slow clients or undersized queues',
      action: 'Increase capacity or drop slow clients',
    },
    {
      key: 'slow_connection_dropped_total',
      label: 'slow_connection_dropped_total',
      value: counter?.slow_connection_dropped_total ?? 0,
      meaning: 'Connections dropped for slow consumption',
      expected: '0',
      warning: 'Occasional for bad clients',
      danger: 'Frequent drops',
      causes: 'Slow networks or excessive payloads',
      action: 'Inspect backpressure and payload sizes',
    },
    {
      key: 'outbound_flush_total',
      label: 'outbound_flush_total',
      value: counter?.outbound_flush_total ?? 0,
      meaning: 'Flush attempts with a message present',
      expected: 'Tracks outbound throughput',
      warning: 'Low vs outbound_total',
      danger: 'Flatline while outbound grows',
      causes: 'Flush loop stalled',
      action: 'Check outbound_flush_empty_total',
    },
    {
      key: 'outbound_flush_empty_total',
      label: 'outbound_flush_empty_total',
      value: counter?.outbound_flush_empty_total ?? 0,
      meaning: 'Flush ticks with no message ready',
      expected: 'Higher when idle',
      warning: 'Near zero when idle',
      danger: 'Zero during idle periods',
      causes: 'Timer failure',
      action: 'Verify flush engine scheduling',
    },
    {
      key: 'outbound_flush_send_fail_total',
      label: 'outbound_flush_send_fail_total',
      value: counter?.outbound_flush_send_fail_total ?? 0,
      meaning: 'Socket send failures during flush',
      expected: '0',
      warning: 'Sporadic errors',
      danger: 'Sustained growth',
      causes: 'Socket errors or disconnects',
      action: 'Inspect network stack logs',
    },
    {
      key: 'outbound_backpressured_total',
      label: 'outbound_backpressured_total',
      value: counter?.outbound_backpressured_total ?? 0,
      meaning: 'Sends skipped due to socket buffer pressure (not dropped)',
      expected: '0',
      warning: 'Sporadic increases during bursts',
      danger: 'Sustained growth',
      causes: 'Slow clients or large payloads',
      action: 'Inspect slow_connection_dropped_total and queue high-water',
    },
    {
      key: 'dropped_in',
      label: 'dropped_in',
      value: counter?.dropped_in ?? 0,
      meaning: 'Inbound events dropped due to overload',
      expected: '0',
      warning: 'Spikes under load',
      danger: 'Sustained growth',
      causes: 'Worker backlog',
      action: 'Inspect event queue capacity',
    },
    {
      key: 'dropped_in_low',
      label: 'dropped_in_low',
      value: counter?.dropped_in_low ?? 0,
      meaning: 'Low-priority inbound drops',
      expected: 'Low during bursts',
      warning: 'Spikes with typing/presence storms',
      danger: 'Sustained high values',
      causes: 'High UI noise',
      action: 'Adjust drop policy or client throttling',
    },
    {
      key: 'dropped_in_high',
      label: 'dropped_in_high',
      value: counter?.dropped_in_high ?? 0,
      meaning: 'High-priority inbound drops',
      expected: '0',
      warning: 'Any non-zero values',
      danger: 'Sustained non-zero',
      causes: 'Severe overload',
      action: 'Scale worker capacity',
    },
    {
      key: 'evicted_in_low_for_high',
      label: 'evicted_in_low_for_high',
      value: counter?.evicted_in_low_for_high ?? 0,
      meaning: 'Low-priority inbound evicted for high-priority',
      expected: 'Low under load',
      warning: 'Spikes during bursts',
      danger: 'Sustained growth',
      causes: 'Overload pressure',
      action: 'Check inbound rate',
    },
    {
      key: 'dropped_out',
      label: 'dropped_out',
      value: counter?.dropped_out ?? 0,
      meaning: 'Outbound drops due to overload',
      expected: '0',
      warning: 'Spikes under fan-out bursts',
      danger: 'Sustained growth',
      causes: 'Queue overflow or slow clients',
      action: 'Inspect per-conn drops',
    },
    {
      key: 'dropped_out_low',
      label: 'dropped_out_low',
      value: counter?.dropped_out_low ?? 0,
      meaning: 'Low-priority outbound drops',
      expected: 'Low during spikes',
      warning: 'Sustained increase',
      danger: 'High sustained growth',
      causes: 'Slow consumers',
      action: 'Check backpressure and slow drops',
    },
    {
      key: 'dropped_out_high',
      label: 'dropped_out_high',
      value: counter?.dropped_out_high ?? 0,
      meaning: 'High-priority outbound drops',
      expected: '0',
      warning: 'Any non-zero',
      danger: 'Sustained non-zero',
      causes: 'Critical overload',
      action: 'Investigate queue sizing',
    },
    {
      key: 'outbound_backpressure',
      label: 'outbound_backpressure',
      value: counter?.outbound_backpressure ?? 0,
      meaning: 'Outbound backpressure events at queue ingress',
      expected: '0',
      warning: 'Spikes during bursts',
      danger: 'Sustained growth',
      causes: 'Queue overflow',
      action: 'Inspect queue high-water marks',
    },
    {
      key: 'event_hiwat',
      label: 'event_hiwat',
      value: gauges?.event_hiwat ?? 0,
      meaning: 'Highest inbound event queue depth since last log',
      expected: 'Near steady low baseline',
      warning: 'Sudden jumps',
      danger: 'Sustained high values',
      causes: 'Worker backlog',
      action: 'Inspect inbound rate vs worker throughput',
    },
    {
      key: 'outbound_hiwat',
      label: 'outbound_hiwat',
      value: gauges?.outbound_hiwat ?? 0,
      meaning: 'Highest outbound queue depth since last log',
      expected: 'Low and stable',
      warning: 'Spikes during fan-out',
      danger: 'Sustained high values',
      causes: 'Backpressure or slow consumers',
      action: 'Check per-conn queue drops',
    },
    {
      key: 'active_connections',
      label: 'active_connections',
      value: gauges?.active_connections ?? 0,
      meaning: 'Number of active WebSocket connections',
      expected: 'Stable within expected load',
      warning: 'Large swings',
      danger: 'Rapid drop to zero',
      causes: 'Network outage or auth failures',
      action: 'Check connection lifecycle',
    },
    {
      key: 'active_users',
      label: 'active_users',
      value: gauges?.active_users ?? 0,
      meaning: 'Best-effort count of active user sessions',
      expected: '≤ active_connections',
      warning: 'Mismatch from connections',
      danger: 'Zero with active connections',
      causes: 'Session creation failure',
      action: 'Inspect auth/session flows',
    },
    {
      key: 'server_ping_ms',
      label: 'server_ping_ms',
      value: gauges?.server_ping_ms ?? 0,
      meaning: 'Control-plane handler latency (ms)',
      expected: '< 10ms local',
      warning: '10–50ms',
      danger: '> 50ms',
      causes: 'HTTP thread pressure',
      action: 'Inspect control-plane load',
    },
    {
      key: 'outbound_tick_hist',
      label: 'outbound_tick_hist',
      value: (hist?.outbound_tick_hist ?? []).join(', '),
      meaning: 'Histogram of outbound messages processed per tick',
      expected: 'Heavier in low buckets',
      warning: 'Shift to high buckets',
      danger: 'Sustained highest bucket growth',
      causes: 'Burst fan-out or backlog',
      action: 'Inspect outbound drain loop and queue sizes',
    },
  ]

  return docs
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard__health {
  position: sticky;
  top: 0;
  z-index: 5;
  background: linear-gradient(180deg, rgba(11, 18, 32, 0.98) 0%, rgba(11, 18, 32, 0.92) 100%);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  padding: 16px 0 20px;
}

.health__title {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 0 4px 12px;
}

.health__title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.health__title p {
  margin: 6px 0 0;
  color: rgba(148, 163, 184, 0.7);
  font-size: 14px;
}

.health__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.dashboard__status {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.8);
}

.status {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.status--error {
  background: rgba(127, 29, 29, 0.8);
  border-color: rgba(239, 68, 68, 0.5);
}

.dashboard__content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.section h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.livekit-panel {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 16px 18px;
}

.livekit-panel__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.8);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  flex-wrap: wrap;
}

.livekit-nodes {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  text-transform: none;
  letter-spacing: 0.04em;
}

.node-pill {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(15, 23, 42, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.node-pill:hover {
  background: rgba(15, 23, 42, 0.9);
  transform: translateY(-1px);
}

.node-pill--up {
  border-color: rgba(34, 197, 94, 0.4);
  color: rgba(34, 197, 94, 0.95);
}

.node-pill--down {
  border-color: rgba(248, 113, 113, 0.45);
  color: rgba(248, 113, 113, 0.9);
  cursor: not-allowed;
  opacity: 0.6;
}

.node-pill--selected {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.6);
  color: rgba(147, 197, 253, 1);
  font-weight: 600;
}

.livekit-section-title {
  margin-top: 24px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.livekit-highlights {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.livekit-empty {
  margin-top: 12px;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.75);
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.command-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
}

.command-card:hover {
  border-color: rgba(148, 163, 184, 0.3);
  transform: translateY(-2px);
}

.command-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.command-card__type {
  font-size: 14px;
  font-weight: 600;
  color: rgba(147, 197, 253, 1);
}

.command-card__count {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.75);
}

.command-card__metrics {
  display: flex;
  gap: 24px;
}

.command-card__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-card__metric .label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(148, 163, 184, 0.6);
}

.command-card__metric .value {
  font-size: 18px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.95);
}
</style>
