<template>
  <div class="border-none p-0">
    <input
      ref="phoneInput"
      class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block"
      :value="modelValue"
      type="tel"
      :required="required"
      :maxlength="15"
      @input="process(($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
import intlTelInput from 'intl-tel-input'
import 'intl-tel-input/build/css/intlTelInput.css'
import { onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    required?: boolean
    /** When set, used for ipinfo.io geo lookup; otherwise defaults to Nigeria. */
    ipinfoToken?: string
  }>(),
  {
    modelValue: '',
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const phoneInput = ref<HTMLInputElement | null>(null)
let phoneInputInstance: ReturnType<typeof intlTelInput> | null = null

const process = (value: string) => {
  if (!value || !phoneInputInstance) return
  const dialCode = '+' + phoneInputInstance.getSelectedCountryData().dialCode
  const phoneNumber = value.startsWith(dialCode) ? value : dialCode + value.slice(-10)
  emit('update:modelValue', phoneNumber)
}

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

onMounted(() => {
  if (!phoneInput.value) return
  const options: Parameters<typeof intlTelInput>[1] = {
    initialCountry: props.ipinfoToken ? 'auto' : 'ng',
    ...(props.ipinfoToken ? { geoIpLookup: getIp } : {}),
    preferredCountries: ['ng', 'us'],
    utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@17/build/js/utils.js',
  }
  phoneInputInstance = intlTelInput(phoneInput.value, options)
})
</script>
