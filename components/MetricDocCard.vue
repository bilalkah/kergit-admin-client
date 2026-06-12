<template>
  <div class="doc-card">
    <div class="doc-card__header">
      <div class="doc-card__title">{{ label }}</div>
      <div class="doc-card__value">{{ value }}</div>
    </div>
    <MetricHelp
      :meaning="meaning"
      :expected="expected"
      :warning="warning"
      :danger="danger"
      :causes="causes"
      :action="action"
    />
  </div>
</template>

<script setup lang="ts">
import MetricHelp from '@/components/MetricHelp.vue'

defineProps<{
  label: string
  value: string | number
  meaning: string
  expected: string
  warning: string
  danger: string
  causes: string
  action: string
}>()
</script>

<style scoped>
.doc-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 16px 18px;
}

.doc-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.doc-card__title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.8);
}

.doc-card__value {
  font-size: 18px;
  font-weight: 600;
  color: #f8fafc;
}
</style>
