<template>
  <div class="relative w-full">
    <input
      ref="input"
      v-bind="forwardedAttrs"
      :type="revealed ? 'text' : 'password'"
      :value="modelValue"
      :readonly="readonly"
      :disabled="disabled"
      class="py-2 pl-3 pr-10 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block
        disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      v-if="!disabled"
      type="button"
      tabindex="-1"
      :aria-label="revealed ? 'Hide password' : 'Show password'"
      :aria-pressed="revealed"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600
        focus:outline-none focus:text-primary"
      @click="toggle"
    >
      <!-- eye (password hidden) -->
      <svg v-if="!revealed" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
      <!-- eye-slash (password revealed) -->
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    modelValue?: string | number
    readonly?: boolean
    disabled?: boolean
  }>(),
  {
    readonly: false,
    disabled: false,
  },
)

defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)
const revealed = ref(false)

// Forward consumer attrs (id, name, autocomplete, required, placeholder, etc.) to the
// inner <input>, but drop class/style so the component keeps full control of its look.
const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const { class: _class, style: _style, type: _type, ...rest } = attrs as Record<string, unknown>
  return rest
})

const toggle = () => {
  revealed.value = !revealed.value
}

onMounted(() => {
  if (input.value?.hasAttribute('autofocus')) {
    input.value.focus()
  }
})

defineExpose({ focus: () => input.value?.focus() })
</script>
