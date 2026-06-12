<template>
  <div class="chart">
    <div class="chart__header">
      <div class="chart__title">{{ label }}</div>
      <div class="chart__legend">
        <span v-for="series in seriesList" :key="series.name" class="legend">
          <span class="legend__dot" :style="{ background: series.color }"></span>
          {{ series.name }}
        </span>
      </div>
    </div>
    <div class="chart__body">
      <div class="chart__canvas">
        <svg
          :viewBox="`0 0 ${width} ${height}`"
          preserveAspectRatio="none"
        >
        <path
          v-for="series in seriesList"
          :key="series.name"
          :d="pathFor(series.values)"
          fill="none"
          :stroke="series.color"
          stroke-width="2"
        />
        </svg>
      </div>
      <div v-if="!hasData" class="chart__empty">Waiting for samples...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  series: { name: string; values: number[]; color: string }[]
  width?: number
  height?: number
}>()

const width = computed(() => props.width ?? 900)
const height = computed(() => props.height ?? 220)

const seriesList = computed(() => props.series)

const hasData = computed(() =>
  seriesList.value.some((series) => series.values.length > 1)
)

const bounds = computed(() => {
  const values = seriesList.value.flatMap((series) => series.values)
  if (!values.length) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { min, max }
})

const pathFor = (values: number[]) => {
  if (values.length < 2) return ''
  const w = width.value
  const h = height.value
  const min = bounds.value.min
  const max = bounds.value.max
  const range = Math.max(max - min, 1)
  const step = w / (values.length - 1)
  return values
    .map((val, idx) => {
      const x = idx * step
      const y = h - ((val - min) / range) * (h - 10) - 5
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}
</script>

<style scoped>
.chart {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 16px 18px 18px;
}

.chart__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
  gap: 16px;
}

.chart__title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(226, 232, 240, 0.8);
}

.chart__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.7);
}

.legend {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.legend__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.chart__body {
  position: relative;
}

.chart__canvas {
  width: 100%;
  height: clamp(180px, 28vh, 260px);
}

.chart__canvas svg {
  width: 100%;
  height: 100%;
  display: block;
}

.chart__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(148, 163, 184, 0.6);
  font-size: 13px;
}
</style>
