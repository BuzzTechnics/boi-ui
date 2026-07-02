<template>
  <div ref="wrapperRef" class="w-full relative">
    <label
      :for="id"
      class="font-semibold text-gray-700 block mb-1.5 md:mb-2 !text-xs md:!text-sm"
      >{{ label }}</label
    >
    <input
      :id="id"
      ref="inputRef"
      :required="required"
      :disabled="disabled"
      :value="inputValue"
      type="text"
      class="form-input w-full border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:border-gray-200"
      :placeholder="placeholder"
      maxlength="20"
      @input="onInput"
      @keypress="preventNonNumericAfterPrefix"
    />
    <small v-if="verifying" class="mt-1 block text-xs text-blue-500">
      Verifying registration number...<i class="fas fa-spinner fa-spin"></i>
    </small>
    <small
      v-else-if="errorMessage && !externalVerified && !suppressInlineError"
      class="mt-1 block text-xs text-red-500"
      v-html="errorMessage"
    ></small>
    <small
      v-else-if="successMessage || externalVerified"
      class="mt-1 block text-xs font-bold text-green-700"
    >
      <span v-if="successMessage" v-html="successMessage"></span>
      <span v-else-if="externalVerifiedMessage"
        >{{ externalVerifiedMessage }} <i class="fas fa-check"></i
      ></span>
      <span v-else>Verified <i class="fas fa-check"></i></span>
    </small>
    <small v-else class="mt-1 block text-xs text-gray-500">
      Must start with at least 2 capital letters followed by numbers (e.g., RC123456, BN123456, LP12345)
    </small>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { jsonFetchInit } from '../lib/csrf'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    id: string
    label?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
    enableCacVerification?: boolean
    externalVerified?: boolean
    externalVerifiedMessage?: string
    suppressInlineError?: boolean
    applicationId?: number | string | null
    /** POST target (e.g. `/api/verify-cac`). */
    verifyUrl?: string
  }>(),
  {
    modelValue: '',
    label: 'Registration Number',
    required: false,
    disabled: false,
    placeholder: 'e.g. RC123456',
    enableCacVerification: false,
    externalVerified: false,
    externalVerifiedMessage: undefined,
    suppressInlineError: false,
    applicationId: null,
    verifyUrl: '/api/verify-cac',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation-error': [message: string]
  'cac-verified': [data: Record<string, unknown>]
  verifying: [value: boolean]
}>()

const inputValue = ref(props.modelValue || '')
const errorMessage = ref('')
const successMessage = ref('')
const verifying = ref(false)
const wrapperRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// A business registration number may use any prefix (RC, BN, LP, IT, …); it just has
// to start with at least two capital letters followed by digits.
const isValidFormat = computed(() => {
  const val = inputValue.value
  if (!val) return false
  const value = String(val).toUpperCase().trim()
  return /^[A-Z]{2,}\d+$/.test(value)
})

const preventNonNumericAfterPrefix = (event: KeyboardEvent) => {
  // Allow only letters and digits (letters form the prefix, digits the number).
  if (event.key.length === 1 && !/[A-Za-z0-9]/.test(event.key)) {
    event.preventDefault()
  }
}

// Normalise: uppercase and strip anything that isn't a letter or digit. We no longer
// force an RC/BN prefix — the prefix can be any 2+ capital letters.
const validateRegistrationNumber = (value: string) => {
  if (!value) return value || ''
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

const verifyCac = async (rcNumber: string) => {
  try {
    verifying.value = true
    emit('verifying', true)
    errorMessage.value = ''
    successMessage.value = ''
    const payload: Record<string, unknown> = { rc_number: rcNumber }
    if (props.applicationId != null && props.applicationId !== '') {
      payload.application_id = Number(props.applicationId)
    }
    const response = await fetch(props.verifyUrl, jsonFetchInit(payload))
    if (response.status === 412) {
      window.location.reload()
      return
    }
    const responseData = (await response.json()) as {
      success?: boolean
      data?: { name?: string; customerNumber?: string }
      message?: string
      errors?: Record<string, string[]>
    }

    if (!response.ok) {
      const errorMessages = responseData.errors
        ? Object.values(responseData.errors).flat().join(' ')
        : ''
      const errorMsg =
        responseData.message || errorMessages || 'Verification failed'
      errorMessage.value = `<span class="text-red-700">${errorMsg} <i class="fas fa-exclamation-triangle"></i></span>`
      emit('validation-error', errorMessage.value)
      return
    }

    if (responseData.success && responseData.data?.name) {
      successMessage.value = `<span class="text-green-700">Verified: ${responseData.data.name} <i class="fas fa-check"></i></span>`
      emit('cac-verified', responseData.data as Record<string, unknown>)
    } else if (responseData.success && !responseData.data?.name) {
      errorMessage.value =
        '<span class="text-red-700">Failed to verify <i class="fas fa-exclamation-triangle"></i></span>'
      emit('validation-error', errorMessage.value)
    } else {
      const errorMsg = responseData.message || 'Verification failed'
      errorMessage.value = `<span class="text-red-700">${errorMsg} <i class="fas fa-exclamation-triangle"></i></span>`
      emit('validation-error', errorMessage.value)
    }
  } catch (error: unknown) {
    const err = error as { message?: string }
    errorMessage.value = `<span class="text-red-700">Error: ${err.message || 'Failed to verify'} <i class="fas fa-exclamation-triangle"></i></span>`
    emit('validation-error', errorMessage.value)
  } finally {
    verifying.value = false
    emit('verifying', false)
  }
}

const validate = async () => {
  if (!inputValue.value) {
    errorMessage.value =
      '<span class="text-red-700">Registration number is required <i class="fas fa-exclamation-triangle"></i></span>'
    return
  }
  const validatedValue = validateRegistrationNumber(inputValue.value)
  if (!isValidFormat.value) {
    errorMessage.value =
      '<span class="text-red-700">Enter a valid registration number — at least 2 capital letters then digits (e.g., RC123456) <i class="fas fa-exclamation-triangle"></i></span>'
    return
  }
  await verifyCac(validatedValue)
}

const handleInputChange = (value: string) => {
  const stringValue = String(value ?? inputValue.value ?? '')
  const validatedValue = validateRegistrationNumber(stringValue)
  inputValue.value = validatedValue
  emit('update:modelValue', validatedValue)
  if (stringValue) {
    errorMessage.value = ''
    successMessage.value = ''
    emit('validation-error', '')
  }
}

const onInput = (e: Event) => {
  const t = e.target as HTMLInputElement
  handleInputChange(t.value)
}

const handleBlur = () => {
  if (props.enableCacVerification && inputValue.value) void validate()
}

onMounted(async () => {
  await nextTick()
  const nativeInput = inputRef.value
  if (nativeInput) nativeInput.addEventListener('blur', handleBlur)
})

onUnmounted(() => {
  const nativeInput = inputRef.value
  if (nativeInput) nativeInput.removeEventListener('blur', handleBlur)
})

defineExpose({ retry: validate })

watch(
  () => props.modelValue,
  (newValue) => {
    const newVal = newValue || ''
    if (newVal !== inputValue.value) inputValue.value = newVal
  },
  { immediate: true },
)
</script>
