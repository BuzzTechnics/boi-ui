<template>
  <div class="col-span-2 md:col-span-1 w-full">
    <div
      class="group flex w-full rounded-lg shadow-sm transition duration-150
        focus-within:ring-2 focus-within:ring-primary/20"
    >
      <span
        class="flex items-center justify-center min-w-[2.75rem] rounded-l-lg border border-r-0 border-gray-300
          bg-gray-50 px-4 text-[15px] font-medium leading-none text-gray-500 select-none transition-colors
          group-hover:border-gray-400 group-focus-within:border-primary group-focus-within:text-primary"
        :class="{ 'border-gray-200 bg-gray-100 !text-gray-300 group-hover:border-gray-200': disabled }"
      >{{ symbol(props.currency) }}</span>
      <input
        ref="input"
        v-bind="forwardedAttrs"
        class="flex-1 min-w-0 rounded-r-lg border border-gray-300 bg-white px-3.5 py-2.5 text-[15px] font-medium
          tracking-tight tabular-nums text-gray-900 transition-colors placeholder:font-normal placeholder:text-gray-400
          group-hover:border-gray-400 read-only:bg-gray-50 focus:border-primary focus:outline-none focus:ring-0
          disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
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
    <!-- Live grouped-amount preview while typing (the field itself shows raw digits
         when focused to avoid cursor jumps), so users don't have to count zeros. -->
    <p
      v-if="previewFormatted && focused && formattedPreview"
      class="mt-1 text-xs font-medium tabular-nums text-gray-500"
    >
      {{ formattedPreview }}
    </p>
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
    /** Show the live comma-grouped amount below the field while typing. */
    previewFormatted?: boolean
  }>(),
  {
    currency: 'NGN',
    readonly: false,
    disabled: false,
    previewFormatted: true,
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

// Grouped, symbol-prefixed amount for the live preview (empty until a valid number).
const formattedPreview = computed(() => {
  const v = props.modelValue
  if (v == null || v === '' || isNaN(Number(v))) return ''
  return symbol(props.currency) + numeral(v).format('0,0.00')
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
