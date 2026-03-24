<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { filesApi } from '../api/files'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    accept?: string
    disabled?: boolean
    id?: string
    maxSize?: number
    allowedTypes?: string[]
    uploadToServer?: boolean
    showRequirements?: boolean
    uploadContext?: string
    afterUpload?: (path: string) => void
    /** Upload URL (default: filesApi.upload()) */
    uploadUrl?: string
    /**
     * Base URL for “View document” (no trailing slash). Use the same host as file uploads when they go
     * through boi-api or a proxy, e.g. `https://glow.test/api/boi-api` → `{base}/api/files/view?path=…`
     * (presign runs on boi-api). If unset, uses `filesApi.view()` (consuming SPA origin / VITE_FILES_API_BASE).
     */
    viewApiBase?: string
    /**
     * S3 storage key for the view link when it must differ from `modelValue` (e.g. model holds EDOC CSV path
     * but the user should open the uploaded PDF).
     */
    viewStoragePath?: string
    /** POST function, e.g. (url, formData, opts) => axios.post(url, formData, opts). Returns Promise<{ data?: { success?, path?, message? } }>. */
    post?: (url: string, body: FormData, options?: { headers?: Record<string, string> }) => Promise<{ data?: unknown }>
  }>(),
  {
    modelValue: '',
    placeholder: 'Choose file',
    accept: '*/*',
    disabled: false,
    maxSize: 10 * 1024 * 1024,
    allowedTypes: () => [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    uploadToServer: true,
    showRequirements: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'validation-error': [message: string]
  'validation-success': [message: string]
  'uploaded': [path: string]
}>()

const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)
const fileName = ref('')
const errorMessage = ref('')

const typeMap: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG', 'image/jpg': 'JPG', 'image/png': 'PNG',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'text/plain': 'TXT', 'text/csv': 'CSV',
}

const extToMime: Record<string, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg', 'image/jpg'], jpeg: ['image/jpeg', 'image/jpg'],
  png: ['image/png'], doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'], csv: ['text/csv'],
}

const allowedFormatsDisplay = computed(() =>
  [...new Set(props.allowedTypes.map((t) => typeMap[t] || t.split('/')[1]?.toUpperCase() || t))].join(', ')
)
const maxSizeMB = computed(() => Math.round(props.maxSize / (1024 * 1024)))
const isDisabled = computed(() => props.disabled || uploading.value)

const viewApiBaseNorm = computed(() => String(props.viewApiBase ?? '').trim().replace(/\/$/, ''))

/** Path used for `/api/files/view` — prefer explicit upload path over `modelValue`. */
const effectiveViewStoragePath = computed(() => {
  const fromProp = String(props.viewStoragePath ?? '').trim()
  if (fromProp) return fromProp
  return String(props.modelValue ?? '').trim()
})

const viewFileUrl = computed(() => {
  const raw = effectiveViewStoragePath.value
  if (!raw || !props.uploadToServer) return '#'
  const path = encodeURIComponent(raw)
  const base = viewApiBaseNorm.value
  if (base) return `${base}/api/files/view?path=${path}`
  return filesApi.view(raw)
})

function validate(file: File): boolean {
  errorMessage.value = ''
  if (file.size > props.maxSize) {
    const msg = `File size must be less than ${maxSizeMB.value}MB`
    errorMessage.value = msg
    emit('validation-error', msg)
    return false
  }
  if (props.allowedTypes.length) {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const ok = props.allowedTypes.includes(file.type) || (extToMime[ext] || []).some((m) => props.allowedTypes.includes(m))
    if (!ok) {
      const msg = `Only ${allowedFormatsDisplay.value} files are allowed`
      errorMessage.value = msg
      emit('validation-error', msg)
      return false
    }
  }
  return true
}

async function handleChange(e: Event) {
  errorMessage.value = ''
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) {
    fileName.value = ''
    emit('update:modelValue', '')
    return
  }
  if (!validate(file)) {
    target.value = ''
    fileName.value = ''
    emit('update:modelValue', '')
    return
  }
  if (props.uploadToServer && props.post) {
    uploading.value = true
    const url = props.uploadUrl ?? filesApi.upload()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'documents')
    if (props.uploadContext) formData.append('context', props.uploadContext)
    try {
      // Do not set Content-Type — axios must set multipart boundary. Same pattern as BankStatementIntegration.
      const res = await props.post(url, formData)
      const data = res?.data as { success?: boolean; path?: string; url?: string; message?: string } | undefined
      if (data?.success && data?.path) {
        fileName.value = file.name
        if (data.url) {
          console.log('[FileInput] S3 URL:', data.url)
        }
        emit('update:modelValue', data.path)
        emit('validation-success', 'File uploaded successfully')
        emit('uploaded', data.path)
        props.afterUpload?.(data.path)
      } else {
        const msg = data?.message ?? 'Upload failed'
        errorMessage.value = msg
        emit('validation-error', msg)
        target.value = ''
        fileName.value = ''
        emit('update:modelValue', '')
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (err as Error)?.message ?? 'Upload failed'
      errorMessage.value = msg
      emit('validation-error', msg)
      target.value = ''
      fileName.value = ''
      emit('update:modelValue', '')
    } finally {
      uploading.value = false
    }
  } else {
    fileName.value = file.name
    emit('update:modelValue', file.name)
    emit('uploaded', file.name)
  }
}

function openDialog() {
  if (!isDisabled.value && fileInput.value) fileInput.value.click()
}

watch(() => props.modelValue, (v) => {
  fileName.value = (typeof v === 'string' && v ? v.split('/').pop() : '') || ''
}, { immediate: true })
</script>

<template>
  <div class="boi-file-input w-full space-y-2">
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :disabled="isDisabled"
      :id="id"
      class="hidden"
      @change="handleChange"
    />
    <div
      :class="[
        'flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 transition-colors',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-50',
        errorMessage ? 'border-red-500' : '',
      ]"
      @click="openDialog"
    >
      <span class="truncate text-sm text-gray-600">{{ uploading ? 'Uploading...' : fileName || placeholder }}</span>
      <span class="text-gray-400">📎</span>
    </div>
    <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
    <p v-if="showRequirements" class="text-xs text-gray-500">Max {{ maxSizeMB }} MB. Allowed: {{ allowedFormatsDisplay }}.</p>
    <a
      v-if="effectiveViewStoragePath && !uploading && uploadToServer"
      :href="viewFileUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="text-sm text-blue-600 hover:underline"
    >
      View document >>>
    </a>
  </div>
</template>
