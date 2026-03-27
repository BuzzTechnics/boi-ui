<template>
  <div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <label :for="idPrefix + '_bvn'" class="block text-sm font-medium text-gray-700">BVN</label>
        <input
          :id="idPrefix + '_bvn'"
          v-model="bvnValue"
          type="tel"
          inputmode="numeric"
          maxlength="11"
          :disabled="disabled"
          placeholder="Enter BVN"
          class="form-input w-full mt-1 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
          @input="emitUpdate"
        />
      </div>
      <div>
        <label :for="idPrefix + '_nin'" class="block text-sm font-medium text-gray-700">NIN</label>
        <input
          :id="idPrefix + '_nin'"
          v-model="ninValue"
          type="tel"
          inputmode="numeric"
          maxlength="11"
          :disabled="disabled"
          placeholder="Enter NIN"
          class="form-input w-full mt-1 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm"
          @input="emitUpdate"
        />
      </div>
    </div>
    <div class="mt-4">
      <button
        type="button"
        class="inline-flex items-center justify-center px-4 py-2 rounded-md text-white font-semibold bg-boi-green hover:bg-boi-green/90 disabled:opacity-50"
        :disabled="!isValid || validating || disabled"
        @click="validate"
      >
        <i v-if="validating" class="fas fa-spinner fa-spin mr-2"></i>
        <span v-if="validating">Validating...</span>
        <span v-else>Validate</span>
      </button>
    </div>
    <small v-if="validateMsg" class="mt-2 block text-xs" v-html="validateMsg"></small>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { jsonFetchInit } from '../lib/csrf'

const props = withDefaults(
  defineProps<{
    modelValue?: { bvn?: string; nin?: string }
    idPrefix?: string
    disabled?: boolean
    /** POST URL for BVN/NIN validation (e.g. Ziggy `route('validate')`). */
    validateUrl: string
  }>(),
  {
    modelValue: () => ({ bvn: '', nin: '' }),
    idPrefix: 'bvn_nin',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: { bvn: string; nin: string }]
  setUser: [user: Record<string, unknown>]
  verificationError: []
}>()

const bvnValue = ref(props.modelValue?.bvn || '')
const ninValue = ref(props.modelValue?.nin || '')
const validating = ref(false)
const validateMsg = ref<string | null>(null)

const isValid = computed(() => bvnValue.value.length === 11 && ninValue.value.length === 11)

const emptyUserFields = (): Record<string, unknown> => ({
  firstName: '',
  middleName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  phone: '',
  home_address: '',
  bvn: bvnValue.value,
  nin: ninValue.value,
})

watch(
  () => props.modelValue,
  (newValue) => {
    bvnValue.value = newValue?.bvn || ''
    ninValue.value = newValue?.nin || ''
  },
  { immediate: true },
)

const emitUpdate = () => {
  emit('update:modelValue', { bvn: bvnValue.value, nin: ninValue.value })
}

const handleError = (message: string) => {
  validateMsg.value = `<span class="text-red-700">${message} <i class="fas fa-exclamation-triangle"></i></span>`
  emit('setUser', emptyUserFields())
  emit('verificationError')
}

async function postValidate(body: Record<string, string>) {
  const response = await fetch(props.validateUrl, jsonFetchInit(body))
  if (response.status === 412) {
    window.location.reload()
    throw new Error('reload')
  }
  const data = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const err = new Error('validation request failed') as Error & {
      response?: { data?: Record<string, unknown> }
    }
    err.response = { data }
    throw err
  }
  return data
}

const validate = async () => {
  if (bvnValue.value.length !== 11) {
    handleError('Valid BVN required (11 digits)')
    return
  }
  if (ninValue.value.length !== 11) {
    handleError('Valid NIN required (11 digits)')
    return
  }

  validateMsg.value = `Confirming BVN and NIN...<i class="fas fa-spinner fa-spin"></i>`
  validating.value = true

  try {
    const [bvnData, ninData] = await Promise.all([
      postValidate({ bvn: bvnValue.value }),
      postValidate({ nin: ninValue.value }),
    ])

    const bvnSuccess =
      bvnData.message === 'Successful' ||
      (bvnData.data &&
        typeof bvnData.data === 'object' &&
        bvnData.data !== null &&
        ((bvnData.data as { firstName?: string; bvn?: string }).firstName ||
          (bvnData.data as { bvn?: string }).bvn))
    const ninSuccess =
      ninData.message === 'Successful' ||
      (ninData.data &&
        typeof ninData.data === 'object' &&
        ninData.data !== null &&
        ((ninData.data as { firstName?: string; nin?: string }).firstName ||
          (ninData.data as { nin?: string }).nin))

    const bvnUser = (bvnData.data as Record<string, unknown>) || bvnData
    const ninUser = (ninData.data as Record<string, unknown>) || ninData

    if (!bvnSuccess) {
      handleError(
        String(bvnData.message || 'BVN verification failed. Please check your BVN.'),
      )
      return
    }
    if (!ninSuccess) {
      handleError(
        String(ninData.message || 'NIN verification failed. Please check your NIN.'),
      )
      return
    }

    const bvnDob = String(
      bvnUser.dateOfBirth || bvnUser.date_of_birth || '',
    ).split('T')[0]
    const ninDob = String(
      ninUser.dateOfBirth || ninUser.date_of_birth || '',
    ).split('T')[0]

    if (!bvnDob || !ninDob) {
      handleError('Date of birth not found in verification data.')
      return
    }
    if (bvnDob !== ninDob) {
      handleError(
        `Date of birth mismatch: BVN date (${bvnDob}) does not match NIN date (${ninDob}).`,
      )
      return
    }

    const mergedData: Record<string, unknown> = {
      firstName: ninUser.firstName || bvnUser.firstName || '',
      middleName: ninUser.middleName || bvnUser.middleName || '',
      lastName: ninUser.lastName || bvnUser.lastName || '',
      dateOfBirth: ninDob,
      bvn: bvnValue.value,
      nin: ninValue.value,
      gender:
        (String(ninUser.gender || bvnUser.gender || '') === 'm'
          ? 'male'
          : String(ninUser.gender || bvnUser.gender || '') === 'f'
            ? 'female'
            : ninUser.gender || bvnUser.gender) || '',
      phone: ninUser.phone || bvnUser.phone || '',
      home_address:
        ninUser.home_address ||
        ninUser.homeAddress ||
        bvnUser.home_address ||
        bvnUser.homeAddress ||
        '',
    }

    validateMsg.value =
      '<span class="text-green-700">BVN and NIN verification successful <i class="fas fa-check"></i></span>'
    emit('setUser', mergedData)
  } catch (err: unknown) {
    const e = err as { message?: string }
    if (e.message === 'reload') return
    const rawMessage =
      (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
        ?.message ??
      (() => {
        const ax = err as { response?: { data?: { errors?: Record<string, string[]> } } }
        const errors = ax.response?.data?.errors
        return errors ? Object.values(errors).flat().join(' ') : null
      })() ??
      (err instanceof Error ? err.message : null)
    const isTechnicalError =
      !rawMessage ||
      /status code \d{3}/i.test(String(rawMessage)) ||
      /RequestException|HTTP request returned/i.test(String(rawMessage))
    const message = isTechnicalError
      ? 'BVN/NIN verification failed. Please check your details and try again, or try again later.'
      : String(rawMessage)
    handleError(message)
  } finally {
    validating.value = false
  }
}
</script>
