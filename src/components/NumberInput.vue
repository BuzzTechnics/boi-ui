<template>
  <div class="w-full">
    <input
      ref="input"
      v-bind="forwardedAttrs"
      :value="modelValue == null ? '' : String(modelValue)"
      :readonly="readonly"
      :disabled="disabled"
      type="text"
      inputmode="numeric"
      class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block
        disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      @input="onInput"
      @keypress="preventNonNumericKey"
    />
    <!-- A plain number field can't hold separators, so the grouped value is shown
         beneath it (auto once the value reaches 1,000; opt in/out with showFormatted). -->
    <p
      v-if="formatted"
      class="mt-1 text-xs font-medium tabular-nums text-gray-500"
    >
      {{ formatted }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue?: string | number
    readonly?: boolean
    disabled?: boolean
    /** Decimal places allowed; 0 (default) restricts to whole numbers (counts). */
    decimals?: number
    /**
     * Grouped preview beneath the field: 'auto' (default) shows it once the value
     * reaches 1,000, 'always' shows it for any number, 'never' suppresses it. (A
     * string, not a boolean — Vue coerces an absent boolean prop to false.)
     */
    formatMode?: 'auto' | 'always' | 'never'
  }>(),
  {
    readonly: false,
    disabled: false,
    decimals: 0,
    formatMode: 'auto',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const input = ref<HTMLInputElement | null>(null)

const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const { class: _class, style: _style, type: _type, ...rest } = attrs as Record<string, unknown>
  return rest
})

const sanitize = (value: string): string => {
  if (props.decimals > 0) {
    const cleaned = String(value).replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    const intPart = parts[0] || ''
    if (parts.length === 1) return intPart
    return intPart + '.' + parts.slice(1).join('').slice(0, props.decimals)
  }
  return String(value).replace(/\D/g, '')
}

const onInput = (e: Event) => {
  emit('update:modelValue', sanitize((e.target as HTMLInputElement).value))
}

const preventNonNumericKey = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey) return
  const allowed = props.decimals > 0 ? /[0-9.]/ : /[0-9]/
  if (e.key && e.key.length === 1 && !allowed.test(e.key)) {
    e.preventDefault()
  }
}

const formatted = computed(() => {
  if (props.formatMode === 'never' || props.disabled || props.readonly) return ''
  const raw = String(props.modelValue ?? '').replace(/,/g, '').trim()
  if (raw === '' || !/^-?\d+(\.\d+)?$/.test(raw)) return ''
  const n = Number(raw)
  if (isNaN(n)) return ''
  // Automatic mode: only worth showing once the number actually needs grouping.
  if (props.formatMode === 'auto' && Math.abs(n) < 1000) return ''
  // Group thousands with a plain regex — no dependency on the runtime's ICU data
  // (Node's small-ICU build won't group via Intl, but browsers do).
  const parts = raw.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  if (parts[1] !== undefined && props.decimals > 0) {
    parts[1] = parts[1].slice(0, props.decimals)
  }
  return parts.length > 1 && props.decimals > 0 ? parts.join('.') : parts[0]
})

onMounted(() => {
  if (input.value?.hasAttribute('autofocus')) {
    input.value.focus()
  }
})

defineExpose({ focus: () => input.value?.focus() })
</script>
