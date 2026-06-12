export type MetricsCounters = {
  inbound_total: number
  outbound_total: number
  parse_fail: number
  auth_fail: number
  membership_fail: number
  payload_parse_total: number
  payload_parse_fail_total: number
  parsed_payload_violation_total: number
  registry_view_access_total: number
  registry_miss_total: number
  registry_copy_elim_total: number
  fanout_sub_snapshot_total: number
  fanout_payload_shared_total: number
  per_conn_enqueued_total: number
  per_conn_dropped_low_total: number
  per_conn_overflow_total: number
  slow_connection_dropped_total: number
  outbound_flush_total: number
  outbound_flush_empty_total: number
  outbound_flush_send_fail_total: number
  outbound_backpressured_total: number
  dropped_in: number
  dropped_in_low: number
  dropped_in_high: number
  evicted_in_low_for_high: number
  dropped_out: number
  dropped_out_low: number
  dropped_out_high: number
  outbound_backpressure: number
}

export type MetricsGauges = {
  event_hiwat: number
  outbound_hiwat: number
  active_connections: number
  active_users: number
  http_health_rtt_ms: number
  client_rtt_avg_ms: number
  client_rtt_max_ms: number
  connections_by_port: number[]
  active_workers: number
  total_workers: number
  current_queue_depth: number
  worker_utilization_pct: number
}

export type MetricsHistograms = {
  outbound_tick_hist: number[]
}

export type CommandTiming = {
  type: number
  name: string
  avg_us: number
  max_us: number
  count: number
}

export type MetricsSnapshotV1 = {
  version: 1
  ts: number
  counters: MetricsCounters
  gauges: MetricsGauges
  histograms: MetricsHistograms
  command_timings: CommandTiming[]
}

export type MetricsTimeseriesV1 = {
  version: 1
  window_sec: number
  samples: MetricsSnapshotV1[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

export const parseTimeseries = (payload: unknown): MetricsTimeseriesV1 => {
  if (!isObject(payload)) {
    throw new Error('Invalid metrics payload')
  }
  if (payload.version !== 1) {
    throw new Error(`Unsupported metrics version: ${payload.version ?? 'unknown'}`)
  }
  return payload as MetricsTimeseriesV1
}

export const parseSnapshot = (payload: unknown): MetricsSnapshotV1 => {
  if (!isObject(payload)) {
    throw new Error('Invalid metrics payload')
  }
  if (payload.version !== 1) {
    throw new Error(`Unsupported metrics version: ${payload.version ?? 'unknown'}`)
  }
  return payload as MetricsSnapshotV1
}
