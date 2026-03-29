<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Pixel size (width & height). Default matches previous h-3.5 w-3.5 (~14px). */
    size?: number
  }>(),
  { size: 14 }
)
</script>

<template>
  <svg
    class="boi-edoc-processing-spinner inline-block shrink-0 text-current"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Loading"
  >
    <circle
      class="boi-edoc-processing-spinner__track"
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      class="boi-edoc-processing-spinner__head"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
</template>

<style scoped>
.boi-edoc-processing-spinner {
  animation: boi-edoc-processing-spin 0.7s linear infinite;
}
.boi-edoc-processing-spinner__track {
  opacity: 0.22;
}
.boi-edoc-processing-spinner__head {
  opacity: 0.95;
}
@keyframes boi-edoc-processing-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
