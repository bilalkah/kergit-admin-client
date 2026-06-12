<template>
  <div class="chart">
    <div class="chart__header">
      <div class="chart__title">{{ label }}</div>
      <div class="chart__meta" v-if="latest !== null">latest: {{ latest }}</div>
    </div>
    <div class="chart__body">
      <svg :viewBox="`0 0 ${width} ${height}`" :width="width" :height="height">
        <path v-if="path" :d="path" fill="none" stroke="#38bdf8" stroke-width="2" />
        <path v-if="area" :d="area" fill="rgba(56, 189, 248, 0.12)" stroke="none" />
      </svg>
      <div v-if="!path" class="chart__empty">Waiting for samples...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  values: number[]
  label: string
  width?: number
  height?: number
}>()

const width = computed(() => props.width ?? 640)
const height = computed(() => props.height ?? 180)

const latest = computed(() => {
  if (!props.values.length) return null
  return props.values[props.values.length - 1]
})

const path = computed(() => {
  const values = props.values
  if (values.length < 2) return ''
  const w = width.value
  const h = height.value
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = Math.max(max - min, 1)
  const step = w / (values.length - 1)
  return values
    .map((val, idx) => {
      const x = idx * step
      const y = h - ((val - min) / range) * (h - 10) - 5
      return `${idx === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

const area = computed(() => {
  if (!path.value) return ''
  const h = height.value
  return `${path.value} L ${width.value} ${h} L 0 ${h} Z`
})
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
}

.chart__title {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(226, 232, 240, 0.8);
}

.chart__meta {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.7);
}

.chart__body {
  position: relative;
  min-height: 180px;
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
