export type LivekitMetricsTarget = {
  id: string
  url: string
}

export type LivekitMetricsResult = {
  id: string
  raw?: string
  error?: string
}

export const fetchLivekitMetrics = async (
  targets: LivekitMetricsTarget[]
): Promise<LivekitMetricsResult[]> => {
  const results = await Promise.all(
    targets.map(async (target) => {
      try {
        const res = await fetch(target.url, {
          headers: { Accept: 'text/plain' },
        })
        if (!res.ok) {
          return { id: target.id, error: `HTTP ${res.status}` }
        }
        const raw = await res.text()
        return { id: target.id, raw }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'request failed'
        return { id: target.id, error: message }
      }
    })
  )

  return results
}
