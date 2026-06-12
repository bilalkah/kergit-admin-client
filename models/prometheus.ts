export type PromSample = {
  name: string
  labels: Record<string, string>
  value: number
  node: string
}

export type LivekitHighlight = {
  key: string
  label: string
  value: string | number
  meta?: string
}

const parseValue = (raw: string): number | null => {
  const value = Number(raw)
  if (!Number.isFinite(value)) return null
  return value
}

const labelRegex = /(\w+)\s*=\s*"((?:\\.|[^"])*)"/g

const parseLabels = (raw: string): Record<string, string> => {
  const labels: Record<string, string> = {}
  if (!raw) return labels
  let match: RegExpExecArray | null
  while ((match = labelRegex.exec(raw))) {
    const key = match[1]
    const value = match[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    labels[key] = value
  }
  return labels
}

export const parsePrometheusSamples = (input: string, node: string): PromSample[] => {
  const samples: PromSample[] = []
  const lines = input.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split(/\s+/)
    if (parts.length < 2) continue

    const metricToken = parts[0]
    const value = parseValue(parts[1])
    if (value === null) continue

    const nameMatch = metricToken.match(/^([^{]+)(?:\{(.+)\})?$/)
    if (!nameMatch) continue

    const name = nameMatch[1]
    const labelRaw = nameMatch[2] ?? ''
    const labels = parseLabels(labelRaw)
    samples.push({ name, labels, value, node })
  }

  return samples
}

const sum = (values: number[]) => values.reduce((acc, val) => acc + val, 0)
const max = (values: number[]) => (values.length ? Math.max(...values) : 0)
const avg = (values: number[]) => (values.length ? sum(values) / values.length : 0)

const buildMap = (samples: PromSample[]) => {
  const byName = new Map<string, number[]>()
  samples.forEach((sample) => {
    const arr = byName.get(sample.name) ?? []
    arr.push(sample.value)
    byName.set(sample.name, arr)
  })
  return byName
}

const pickMetric = (
  byName: Map<string, number[]>,
  candidates: string[],
  agg: 'sum' | 'max' | 'avg' = 'sum'
): { name: string; value: number } | null => {
  for (const name of candidates) {
    const values = byName.get(name)
    if (!values || !values.length) continue
    const value = agg === 'max' ? max(values) : agg === 'avg' ? avg(values) : sum(values)
    return { name, value }
  }
  return null
}

const pickMetricByLabel = (
  samples: PromSample[],
  name: string,
  labelKey: string,
  labelValue: string,
  agg: 'sum' | 'max' | 'avg' = 'sum'
): { name: string; value: number } | null => {
  const values = samples
    .filter((sample) => sample.name === name && sample.labels[labelKey] === labelValue)
    .map((sample) => sample.value)

  if (!values.length) return null

  const value = agg === 'max' ? max(values) : agg === 'avg' ? avg(values) : sum(values)
  return { name: `${name}{${labelKey}="${labelValue}"}`, value }
}

const ratioFrom = (
  byName: Map<string, number[]>,
  sumName: string,
  countName: string
): number | null => {
  const sums = byName.get(sumName) ?? []
  const counts = byName.get(countName) ?? []
  const totalCount = sum(counts)
  if (!totalCount) return null
  return sum(sums) / totalCount
}

const ratioFromLabel = (
  samples: PromSample[],
  sumName: string,
  countName: string,
  labelKey: string,
  labelValue: string
): number | null => {
  const sums = samples
    .filter(
      (sample) =>
        sample.name === sumName &&
        sample.labels[labelKey] === labelValue
    )
    .map((sample) => sample.value)
  const counts = samples
    .filter(
      (sample) =>
        sample.name === countName &&
        sample.labels[labelKey] === labelValue
    )
    .map((sample) => sample.value)

  const totalCount = sum(counts)
  if (!totalCount) return null
  return sum(sums) / totalCount
}

const sumByLabel = (
  samples: PromSample[],
  name: string,
  labelKey: string,
  labelValue: string
): number | null => {
  const values = samples
    .filter((sample) => sample.name === name && sample.labels[labelKey] === labelValue)
    .map((sample) => sample.value)
  if (!values.length) return null
  return sum(values)
}

export const deriveLivekitHighlights = (samples: PromSample[]): LivekitHighlight[] => {
  const byName = buildMap(samples)
  const roomsLabelKeys = ['room', 'room_name', 'room_id']
  const participantLabelKeys = ['participant', 'participant_id', 'identity', 'user_id']

  const rooms = new Set<string>()
  const participants = new Set<string>()

  samples.forEach((sample) => {
    for (const key of roomsLabelKeys) {
      const value = sample.labels[key]
      if (value) rooms.add(value)
    }
    for (const key of participantLabelKeys) {
      const value = sample.labels[key]
      if (value) participants.add(value)
    }
  })

  const roomMetric =
    pickMetric(
      byName,
      ['livekit_room_total', 'livekit_room_count', 'livekit_active_rooms', 'livekit_rooms'],
      'max'
    ) ?? null
  const participantMetric =
    pickMetric(
      byName,
      [
        'livekit_participant_total',
        'livekit_room_participants',
        'livekit_room_num_participants',
        'livekit_participants',
      ],
      'max'
    ) ?? null

  const publishedTracksMetric = pickMetric(
    byName,
    ['livekit_track_published_total', 'livekit_published_tracks'],
    'sum'
  )
  const subscribedTracksMetric = pickMetric(
    byName,
    ['livekit_track_subscribed_total', 'livekit_subscribed_tracks'],
    'sum'
  )
  const publishedTrackCounter = pickMetricByLabel(
    samples,
    'livekit_track_publish_counter',
    'state',
    'success',
    'sum'
  )
  const subscribedTrackCounter = pickMetricByLabel(
    samples,
    'livekit_track_subscribe_counter',
    'state',
    'success',
    'sum'
  )

  const trackMetric =
    pickMetric(byName, ['livekit_track_total', 'livekit_room_tracks'], 'sum') ??
    (publishedTracksMetric && subscribedTracksMetric
      ? {
          name: 'max(livekit_track_published_total, livekit_track_subscribed_total)',
          value: Math.max(publishedTracksMetric.value, subscribedTracksMetric.value),
        }
      : publishedTracksMetric ??
        subscribedTracksMetric ??
        pickMetric(byName, ['livekit_tracks'], 'sum'))
  const trackFallbackMetric =
    publishedTrackCounter ??
    subscribedTrackCounter

  const forwardLatencyNs = ratioFrom(
    byName,
    'livekit_forward_latency_ns_sum',
    'livekit_forward_latency_ns_count'
  )
  const rttAvgMs = ratioFrom(byName, 'livekit_rtt_ms_sum', 'livekit_rtt_ms_count')
  const incomingRttAvgMs = ratioFromLabel(
    samples,
    'livekit_rtt_ms_sum',
    'livekit_rtt_ms_count',
    'direction',
    'incoming'
  )
  const outgoingRttAvgMs = ratioFromLabel(
    samples,
    'livekit_rtt_ms_sum',
    'livekit_rtt_ms_count',
    'direction',
    'outgoing'
  )
  const forwardLatencyGauge = pickMetric(byName, ['livekit_forward_latency'], 'avg')
  const signalSendAvgMs = ratioFrom(
    byName,
    'livekit_psrpc_stream_send_time_ms_sum',
    'livekit_psrpc_stream_send_time_ms_count'
  )

  const packetIn = sumByLabel(samples, 'livekit_packet_total', 'direction', 'incoming')
  const packetOut = sumByLabel(samples, 'livekit_packet_total', 'direction', 'outgoing')
  const nodeMessages = pickMetric(byName, ['livekit_node_messages'], 'sum')

  const cpuMetric = pickMetric(byName, ['process_cpu_seconds_total'], 'sum')
  const memMetric = pickMetric(byName, ['process_resident_memory_bytes'], 'max')

  // Connection stage metrics
  const participantSignalConnected =
    pickMetricByLabel(samples, 'livekit_participant_join_total', 'state', 'signal_connected', 'sum') ??
    pickMetric(byName, ['livekit_participant_joined'], 'sum')
  const participantRtcInit = pickMetricByLabel(
    samples,
    'livekit_participant_join_total',
    'state',
    'rtc_init',
    'sum'
  )
  const participantRtcConnected =
    pickMetricByLabel(samples, 'livekit_participant_join_total', 'state', 'rtc_connected', 'sum') ??
    pickMetric(byName, ['livekit_participant_connected', 'livekit_participant_ice_connected'], 'sum')
  const udpConnections = pickMetric(byName, ['livekit_transport_udp', 'livekit_udp_active'], 'sum')
  const failedConnections = pickMetric(byName, ['livekit_participant_failed', 'livekit_ice_failed'], 'sum')
  const exporterNodeIds = Array.from(
    new Set(samples.map((sample) => sample.labels.node_id).filter((value): value is string => !!value))
  )

  const highlights: LivekitHighlight[] = [
    {
      key: 'rooms',
      label: 'Active Rooms',
      value: roomMetric ? Math.round(roomMetric.value) : rooms.size || '--',
      meta: roomMetric ? `metric: ${roomMetric.name}` : rooms.size ? 'from labels' : 'no metric',
    },
    {
      key: 'participants',
      label: 'Active Participants',
      value: participantMetric ? Math.round(participantMetric.value) : participants.size || '--',
      meta: participantMetric
        ? `metric: ${participantMetric.name}`
        : participants.size
          ? 'from labels'
          : 'no metric',
    },
  ]

  // Connection stages
  if (participantSignalConnected) {
    highlights.push({
      key: 'participant_signal_connected',
      label: 'Signal Connected',
      value: Math.round(participantSignalConnected.value),
      meta: `metric: ${participantSignalConnected.name}`,
    })
  }

  if (participantRtcInit) {
    highlights.push({
      key: 'participant_rtc_init',
      label: 'RTC Init',
      value: Math.round(participantRtcInit.value),
      meta: `metric: ${participantRtcInit.name}`,
    })
  }

  if (participantRtcConnected) {
    highlights.push({
      key: 'participant_rtc_connected',
      label: 'RTC Connected',
      value: Math.round(participantRtcConnected.value),
      meta: `metric: ${participantRtcConnected.name}`,
    })
  }

  if (udpConnections) {
    highlights.push({
      key: 'udp_connections',
      label: 'UDP Established (Stage 3)',
      value: Math.round(udpConnections.value),
      meta: `metric: ${udpConnections.name}`,
    })
  }

  if (failedConnections) {
    highlights.push({
      key: 'failed_connections',
      label: 'Failed Connections',
      value: Math.round(failedConnections.value),
      meta: `metric: ${failedConnections.name}`,
    })
  }

  highlights.push({
    key: 'tracks',
    label: 'Tracks',
    value: trackMetric
      ? Math.round(trackMetric.value)
      : trackFallbackMetric
        ? Math.round(trackFallbackMetric.value)
        : '--',
    meta: trackMetric
      ? `metric: ${trackMetric.name}`
      : trackFallbackMetric
        ? `metric: ${trackFallbackMetric.name} (cumulative)`
        : 'no metric',
  })

  if (publishedTracksMetric) {
    highlights.push({
      key: 'published_tracks',
      label: 'Published Tracks',
      value: Math.round(publishedTracksMetric.value),
      meta: `metric: ${publishedTracksMetric.name}`,
    })
  }

  if (subscribedTracksMetric) {
    highlights.push({
      key: 'subscribed_tracks',
      label: 'Subscribed Tracks',
      value: Math.round(subscribedTracksMetric.value),
      meta: `metric: ${subscribedTracksMetric.name}`,
    })
  }

  if (incomingRttAvgMs !== null) {
    highlights.push({
      key: 'latency',
      label: 'Latency (ms)',
      value: Number.isFinite(incomingRttAvgMs) ? incomingRttAvgMs.toFixed(2) : '--',
      meta:
        outgoingRttAvgMs !== null
          ? `metric: livekit_rtt_ms (incoming avg, outgoing ${outgoingRttAvgMs.toFixed(2)}ms)`
          : 'metric: livekit_rtt_ms (incoming sum/count)',
    })
  } else if (rttAvgMs !== null) {
    highlights.push({
      key: 'latency',
      label: 'Latency (ms)',
      value: Number.isFinite(rttAvgMs) ? rttAvgMs.toFixed(2) : '--',
      meta: 'metric: livekit_rtt_ms (sum/count)',
    })
  } else if (forwardLatencyNs !== null) {
    const ms = forwardLatencyNs / 1e6
    highlights.push({
      key: 'latency',
      label: 'Latency (ms)',
      value: Number.isFinite(ms) ? ms.toFixed(2) : '--',
      meta: 'metric: livekit_forward_latency_ns (sum/count)',
    })
  } else if (forwardLatencyGauge) {
    highlights.push({
      key: 'latency',
      label: 'Latency (ms)',
      value: Number.isFinite(forwardLatencyGauge.value) ? forwardLatencyGauge.value.toFixed(2) : '--',
      meta: `metric: ${forwardLatencyGauge.name} (raw gauge)`,
    })
  } else {
    highlights.push({
      key: 'latency',
      label: 'Latency (ms)',
      value: '--',
      meta: 'no metric',
    })
  }

  if (exporterNodeIds.length > 0) {
    highlights.push({
      key: 'exporter_node_id',
      label: 'Exporter Node ID',
      value: exporterNodeIds.length === 1 ? exporterNodeIds[0] : exporterNodeIds.length,
      meta:
        exporterNodeIds.length === 1
          ? 'from label: node_id'
          : `from label: node_id (${exporterNodeIds.join(', ')})`,
    })
  }

  if (signalSendAvgMs !== null) {
    highlights.push({
      key: 'signal_send_ms',
      label: 'Signal Send (ms)',
      value: signalSendAvgMs.toFixed(2),
      meta: 'metric: livekit_psrpc_stream_send_time_ms',
    })
  }

  if (packetIn !== null) {
    highlights.push({
      key: 'packet_in',
      label: 'Packets In',
      value: Math.round(packetIn),
      meta: 'metric: livekit_packet_total',
    })
  }

  if (packetOut !== null) {
    highlights.push({
      key: 'packet_out',
      label: 'Packets Out',
      value: Math.round(packetOut),
      meta: 'metric: livekit_packet_total',
    })
  }

  if (nodeMessages) {
    highlights.push({
      key: 'node_messages',
      label: 'Node Messages',
      value: Math.round(nodeMessages.value),
      meta: `metric: ${nodeMessages.name}`,
    })
  }

  if (cpuMetric) {
    highlights.push({
      key: 'cpu_time',
      label: 'CPU Time (s)',
      value: cpuMetric.value.toFixed(1),
      meta: `metric: ${cpuMetric.name}`,
    })
  }

  if (memMetric) {
    highlights.push({
      key: 'memory',
      label: 'Memory (MB)',
      value: (memMetric.value / (1024 * 1024)).toFixed(1),
      meta: `metric: ${memMetric.name}`,
    })
  }

  return highlights
}
