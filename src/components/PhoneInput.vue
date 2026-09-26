<template>
  <div class="border-none p-0">
    <input
      ref="phoneInput"
      class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200"
      type="tel"
      :required="required"
      :disabled="disabled"
      :maxlength="20"
      @input="emitNormalized"
      @blur="emitNormalized"
    />
  </div>
</template>

<script setup lang="ts">
import intlTelInput from 'intl-tel-input'
import 'intl-tel-input/build/css/intlTelInput.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    required?: boolean
    disabled?: boolean
    /** When set, used for ipinfo.io geo lookup; otherwise defaults to Nigeria. */
    ipinfoToken?: string
  }>(),
  {
    modelValue: '',
    required: false,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const phoneInput = ref<HTMLInputElement | null>(null)
let iti: ReturnType<typeof intlTelInput> | null = null

const getIp = (callback: (iso2: string) => void) => {
  if (!props.ipinfoToken) {
    callback('ng')
    return
  }
  fetch(`https://ipinfo.io/json?token=${encodeURIComponent(props.ipinfoToken)}`)
    .then((response) => response.json())
    .then((data: { country?: string }) => callback(data.country || 'ng'))
    .catch(() => callback('ng'))
}

/**
 * Always emit the number in international E.164 form (e.g. +2348012345678) so it
 * is stored with its country code. intl-tel-input's getNumber() returns E.164
 * once utils.js has loaded; before that (or when a partial number can't yet be
 * parsed) we fall back to dial-code + typed national digits so a value is never
 * emitted without the country code.
 */
const emitNormalized = () => {
  if (!iti || !phoneInput.value) return
  const typed = phoneInput.value.value.trim()
  if (typed === '') {
    emit('update:modelValue', '')
    return
  }

  const e164 = iti.getNumber()
  if (e164) {
    emit('update:modelValue', e164)
    return
  }

  const dialCode = iti.getSelectedCountryData().dialCode || '234'
  const national = typed.replace(/\D+/g, '').replace(/^0+/, '')
  emit('update:modelValue', national ? `+${dialCode}${national}` : '')
}

/** Render an existing E.164/international value into the field (flag + national part). */
const seed = (value?: string) => {
  if (!iti || !value) return
  iti.setNumber(value)
}

onMounted(() => {
  if (!phoneInput.value) return
  const options: Parameters<typeof intlTelInput>[1] = {
    initialCountry: props.ipinfoToken ? 'auto' : 'ng',
    ...(props.ipinfoToken ? { geoIpLookup: getIp } : {}),
    preferredCountries: ['ng', 'us'],
    utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@17/build/js/utils.js',
  }
  iti = intlTelInput(phoneInput.value, options)
  // Re-normalise when the user picks a different country from the flag dropdown.
  phoneInput.value.addEventListener('countrychange', emitNormalized)
  if (props.modelValue) seed(props.modelValue)
})

onBeforeUnmount(() => {
  phoneInput.value?.removeEventListener('countrychange', emitNormalized)
  iti?.destroy()
  iti = null
})

// Reflect external modelValue changes (e.g. async prefill) into the field, but
// never clobber what the user is actively typing.
watch(
  () => props.modelValue,
  (value) => {
    if (!iti || !phoneInput.value) return
    if (value && value !== iti.getNumber() && document.activeElement !== phoneInput.value) {
      seed(value)
    }
  },
)
</script>
