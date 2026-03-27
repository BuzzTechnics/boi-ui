<template>
  <div class="form-group col-span-2 md:col-span-1 border-none p-0">
    <div class="relative w-full flex">
      <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        {{ symbol(props.currency) }}
      </div>
      <input
        ref="input"
        :class="[
          { 'bg-gray-100': readonly },
          { 'bg-gray-200 text-gray-500 cursor-not-allowed': disabled },
          'pl-8 w-full border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm',
        ]"
        :value="props.modelValue"
        @input="onInput"
        @keypress="preventNonNumericInput"
        :readonly="readonly"
        :disabled="disabled"
        type="number"
        step="0.01"
        min="0"
        inputmode="decimal"
        pattern="[0-9]*[.]?[0-9]*"
        placeholder="0.00"
      />
    </div>
    <div class="mt-1 text-sm text-gray-600 font-medium">
      {{ numberWithCommas(props.modelValue, props.currency) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import numeral from 'numeral'
import { onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    currency?: string
    readonly?: boolean
    disabled?: boolean
  }>(),
  {
    currency: 'NGN',
    readonly: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)

const sanitizeNumericInput = (value: string) => {
  if (!value) return ''
  const sanitized = value.toString().replace(/[^0-9.]/g, '')
  const parts = sanitized.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts[1]
  }
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].slice(0, 2)
  }
  return sanitized
}

const preventNonNumericInput = (event: KeyboardEvent) => {
  const charCode = event.which ? event.which : event.keyCode
  const target = event.target as HTMLInputElement
  if (charCode === 46 && target.value.includes('.')) {
    event.preventDefault()
    return
  }
  if ((charCode < 48 || charCode > 57) && charCode !== 46) {
    event.preventDefault()
  }
}

onMounted(() => {
  if (input.value?.hasAttribute('autofocus')) {
    input.value.focus()
  }
})

const symbol = (code: string) => {
  if (code === 'NGN') return '₦'
  if (code === 'USD') return '$'
  return ''
}

const numberWithCommas = (x: string | number | undefined, code: string | null = null) => {
  if (x != null && x !== '' && !isNaN(Number(x))) {
    return symbol(code || '') + numeral(x).format('0,0.00')
  }
  return symbol(code || '') + '0.00'
}

const onInput = (e: Event) => {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', sanitizeNumericInput(t.value))
}

defineExpose({ focus: () => input.value?.focus() })
</script>
