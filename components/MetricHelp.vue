<template>
  <details class="help">
    <summary class="help__summary">details</summary>
    <div class="help__body">
      <div><strong>Meaning:</strong> {{ meaning }}</div>
      <div><strong>Expected:</strong> {{ expected }}</div>
      <div><strong>Warning:</strong> {{ warning }}</div>
      <div><strong>Danger:</strong> {{ danger }}</div>
      <div><strong>Possible causes:</strong> {{ causes }}</div>
      <div><strong>Action:</strong> {{ action }}</div>
    </div>
  </details>
</template>

<script setup lang="ts">
defineProps<{
  meaning: string
  expected: string
  warning: string
  danger: string
  causes: string
  action: string
}>()
</script>

<style scoped>
.help {
  margin-top: 10px;
  font-size: 12px;
  color: rgba(148, 163, 184, 0.8);
}

.help__summary {
  cursor: pointer;
  color: rgba(56, 189, 248, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 11px;
}

.help__body {
  margin-top: 8px;
  display: grid;
  gap: 6px;
}
</style>
