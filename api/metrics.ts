import { parseSnapshot, parseTimeseries, type MetricsSnapshotV1, type MetricsTimeseriesV1 } from '@/models/metrics'

const getMetricsBaseUrl = () => {
  const config = useRuntimeConfig()
  const base = (config.public.adminMetricsBase || '/admin-api').trim()
  return base.endsWith('/') ? base.slice(0, -1) : base
}

export const fetchSnapshot = async (): Promise<MetricsSnapshotV1> => {
  const baseUrl = getMetricsBaseUrl()
  const res = await fetch(`${baseUrl}/metrics/snapshot`)
  if (!res.ok) {
    throw new Error(`Snapshot request failed: ${res.status}`)
  }
  const json = await res.json()
  return parseSnapshot(json)
}

export const fetchTimeseries = async (windowSec = 60): Promise<MetricsTimeseriesV1> => {
  const baseUrl = getMetricsBaseUrl()
  const res = await fetch(`${baseUrl}/metrics/timeseries?window=${windowSec}`)
  if (!res.ok) {
    throw new Error(`Timeseries request failed: ${res.status}`)
  }
  const json = await res.json()
  return parseTimeseries(json)
}
