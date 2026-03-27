<template>
  <input
    ref="input"
    :id="id"
    class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block"
    type="text"
    inputmode="numeric"
    :value="props.modelValue"
    :maxlength="maxlength"
    :placeholder="placeholder"
    :required="required"
    :disabled="disabled"
    @input="handleInput"
    @keypress="handleKeypress"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    id?: string
    modelValue?: string | number
    maxlength?: number
    placeholder?: string
    required?: boolean
    disabled?: boolean
  }>(),
  {
    placeholder: 'Enter TIN',
    required: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  let value = target.value
  value = value.replace(/[^0-9]/g, '')

  if (value !== target.value) {
    target.value = value
  }

  emit('update:modelValue', value)
}

const handleKeypress = (event: KeyboardEvent) => {
  const key = event.key
  if (
    !/[0-9]/.test(key) &&
    !['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)
  ) {
    event.preventDefault()
  }
}

onMounted(() => {
  if (input.value?.hasAttribute('autofocus')) {
    input.value.focus()
  }
})

defineExpose({ focus: () => input.value?.focus() })
</script>
