<template>
  <div class="card">
    <div class="card__label">{{ label }}</div>
    <div class="card__value">{{ value }}</div>
    <div v-if="meta" class="card__meta">{{ meta }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number; meta?: string }>()
</script>

<style scoped>
.card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.card__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(148, 163, 184, 0.8);
}

.card__value {
  font-size: 24px;
  font-weight: 600;
  color: #f8fafc;
}

.card__meta {
  font-size: 12px;
  color: rgba(148, 163, 184, 0.7);
}
</style>
