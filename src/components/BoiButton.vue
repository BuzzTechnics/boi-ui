<script setup lang="ts">
defineProps<{
  label?: string
  variant?: 'primary' | 'secondary'
}>()
</script>

<template>
  <button
    type="button"
    class="boi-button"
    :class="[variant ? `boi-button--${variant}` : 'boi-button--primary']"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.boi-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  border: none;
}
.boi-button--primary {
  background: #2563eb;
  color: white;
}
.boi-button--primary:hover {
  background: #1d4ed8;
}
.boi-button--secondary {
  background: #e5e7eb;
  color: #374151;
}
.boi-button--secondary:hover {
  background: #d1d5db;
}
</style>
