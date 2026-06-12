<template>
  <div class="chart">
    <div class="chart__header">
      <div class="chart__title">{{ label }}</div>
      <div class="chart__meta">{{ buckets.length }} buckets</div>
    </div>
    <div class="chart__body">
      <div class="bars">
        <div
          v-for="(value, idx) in visibleBuckets"
          :key="idx"
          class="bar"
          :style="{ height: `${scaled(value)}%` }"
        >
          <span class="bar__label">{{ idx + 1 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  buckets: number[]
}>()

const visibleBuckets = computed(() => props.buckets.slice(1))

const scaled = (value: number) => {
  const max = Math.max(...visibleBuckets.value, 1)
  return Math.round((value / max) * 100)
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
  height: clamp(140px, 22vh, 200px);
  display: flex;
  align-items: flex-end;
}

.bars {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(40px, 1fr));
  gap: 12px;
  align-items: flex-end;
  width: 100%;
  height: 100%;
}

.bar {
  position: relative;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.8), rgba(14, 116, 144, 0.9));
  border-radius: 10px 10px 4px 4px;
  min-height: 12px;
}

.bar__label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: rgba(148, 163, 184, 0.7);
}
</style>
