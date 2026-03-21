<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { BankOption } from '../types/edoc'
import { cn } from '../lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options: BankOption[]
    placeholder?: string
    disabled?: boolean
    id?: string
  }>(),
  { placeholder: 'Select bank', disabled: false }
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const isOpen = ref(false)
const selectRef = ref<HTMLDivElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const highlightedIndex = ref(-1)

function optionMatchesQuery(opt: BankOption, q: string): boolean {
  if (!q) return true
  const parts = [
    opt.label,
    opt.shortName,
    ...(opt.searchKeywords ?? []),
  ]
    .filter((s) => s != null && String(s).trim() !== '')
    .map((s) => String(s).toLowerCase())

  // Any field contains full query (e.g. "fcmb", "first city")
  if (parts.some((p) => p.includes(q))) return true

  // Multi-word: each token must match somewhere (label, short name, or keyword)
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length > 1) {
    return tokens.every((t) => parts.some((p) => p.includes(t)))
  }

  // Single token: also allow prefix-style match on short name / keywords (e.g. "fcm" → FCMB)
  return parts.some((p) => p.startsWith(q))
}

const filteredOptions = computed(() => {
  if (!props.options?.length) return []
  if (!searchQuery.value.trim()) return props.options
  const q = searchQuery.value.toLowerCase().trim()
  return props.options.filter((opt) => optionMatchesQuery(opt, q))
})

const selectedOption = computed(() =>
  props.options?.find((o) => String(o.value) === String(props.modelValue)) ?? null
)

const displayValue = computed(() => selectedOption.value?.label ?? props.placeholder)

function toggle() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    highlightedIndex.value = filteredOptions.value.length ? 0 : -1
    nextTick(() => searchRef.value?.focus())
  }
}

function select(opt: BankOption) {
  emit('update:modelValue', String(opt.value))
  isOpen.value = false
  searchQuery.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  const opts = filteredOptions.value
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, opts.length - 1)
      break
    case 'ArrowUp':
      e.preventDefault()
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      if (highlightedIndex.value >= 0 && opts[highlightedIndex.value]) {
        select(opts[highlightedIndex.value])
      }
      break
    case 'Escape':
      e.preventDefault()
      isOpen.value = false
      break
  }
}

function onClickOutside(e: Event) {
  if (selectRef.value && !selectRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

watch(searchQuery, () => {
  highlightedIndex.value = filteredOptions.value.length ? 0 : -1
})

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onClickOutside)
  }
})
</script>

<template>
  <div ref="selectRef" class="relative">
    <button
      type="button"
      :id="id"
      :disabled="disabled"
      :class="cn(
        'flex h-9 w-full min-w-0 items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-colors outline-none',
        'focus:border-[var(--boi-primary)] focus:ring-1 focus:ring-[var(--boi-primary)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !selectedOption && 'text-gray-500'
      )"
      @click="toggle"
    >
      <span class="truncate text-left">{{ displayValue }}</span>
      <svg class="h-4 w-4 shrink-0 text-gray-400" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute z-[1000] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg"
    >
      <div class="border-b border-gray-100 p-2">
        <div class="relative">
          <svg class="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref="searchRef"
            v-model="searchQuery"
            type="text"
            placeholder="Type to search..."
            class="w-full rounded-md border-0 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:bg-white focus:ring-1 focus:ring-[var(--boi-primary)]"
            @keydown="onKeydown"
          />
        </div>
      </div>
      <div class="max-h-48 overflow-auto py-1">
        <button
          v-for="(option, index) in filteredOptions"
          :key="option.value"
          type="button"
          :class="cn(
            'w-full cursor-pointer px-3 py-2.5 text-left text-sm transition-colors text-gray-900',
            index === highlightedIndex ? 'bg-gray-100' : 'hover:bg-gray-50',
            String(option.value) === String(modelValue) &&
              modelValue !== '' &&
              modelValue !== undefined &&
              'font-semibold text-[#016837]'
          )"
          @click="select(option)"
        >
          {{ option.label }}
        </button>
        <p v-if="filteredOptions.length === 0" class="px-3 py-2 text-center text-sm italic text-gray-500">
          No options found for "{{ searchQuery }}"
        </p>
      </div>
    </div>
  </div>
</template>
