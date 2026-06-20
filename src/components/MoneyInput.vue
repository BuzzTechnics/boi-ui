<template>
  <div class="col-span-2 md:col-span-1 w-full">
    <div
      class="flex items-center w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-sm transition-colors
        focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"
      :class="{
        'bg-gray-100': readonly && !disabled,
        'bg-gray-200 cursor-not-allowed': disabled,
      }"
    >
      <span
        class="flex items-center self-stretch px-3 border-r border-gray-300 bg-gray-50 text-gray-500 select-none leading-none"
        :class="{ 'text-gray-400 bg-gray-100': disabled }"
      >{{ symbol(props.currency) }}</span>
      <input
        ref="input"
        v-bind="forwardedAttrs"
        class="flex-1 min-w-0 border-0 bg-transparent py-2 pl-1 pr-3 text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:text-gray-500"
        :value="displayValue"
        @focus="focused = true"
        @blur="focused = false"
        @input="onInput"
        @keypress="preventNonNumericInput"
        :readonly="readonly"
        :disabled="disabled"
        type="text"
        inputmode="decimal"
        placeholder="0.00"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import numeral from 'numeral';
import { computed, onMounted, ref, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false })

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
const focused = ref(false)

// Forward consumer attrs (id, name, @input validators, etc.) to the inner <input>,
// but drop class/style so a stray utility like `form-input` can't draw a second border
// on the wrapper. The component styles itself.
const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs as Record<string, unknown>
  return rest
})

// While editing, show the raw value so typing stays jank-free (no comma cursor jumps).
// When not focused, show the grouped, two-decimal amount.
const displayValue = computed(() => {
  const v = props.modelValue
  if (focused.value) return v == null ? '' : String(v)
  if (v == null || v === '' || isNaN(Number(v))) return ''
  return numeral(v).format('0,0.00')
})

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

const onInput = (e: Event) => {
  const t = e.target as HTMLInputElement
  emit('update:modelValue', sanitizeNumericInput(t.value))
}

defineExpose({ focus: () => input.value?.focus() })
</script>
