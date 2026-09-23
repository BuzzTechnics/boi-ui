<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { readXsrfTokenFromCookie } from '../lib/csrf'

/**
 * Shared customer document library, used by every intervention fund's portal. It is
 * endpoint-driven: point it at the base URL a fund mounts the shared backend routes
 * under (Boi\Backend\BoiBackend::documentLibraryRoutes) and it handles the rest —
 * listing requested documents, uploading each, the completeness gate, and submit.
 */
interface DocVersion {
  version: number
  original_name: string | null
  uploaded_at: string | null
}
interface Doc {
  id: number
  name: string
  category: string | null
  is_mandatory: boolean
  instructions: string | null
  status: string
  officer_comment: string | null
  uploadable: boolean
  latest_version: DocVersion | null
}
interface DocRequest {
  id: number
  reference: string
  stage_label: string
  status: string
  message: string | null
  due_at: string | null
  submitted_at: string | null
  can_submit: boolean
  outstanding_count: number
  documents: Doc[]
}

const props = defineProps<{
  /** Base URL the fund mounted the document-library routes under, e.g. "/dashboard/disbursement-library". */
  baseUrl: string
  /** Optional intro text shown above the list. */
  title?: string
  description?: string
}>()

const emit = defineEmits<{ (e: 'changed'): void; (e: 'error', message: string): void }>()

const requests = ref<DocRequest[]>([])
const loading = ref(true)
const busyId = ref<number | null>(null)

const STATUS_LABELS: Record<string, string> = {
  requested: 'Outstanding',
  uploaded: 'Uploaded',
  accepted: 'Accepted',
  returned: 'Returned — re-upload',
  waived: 'Waived',
}
function statusClass(status: string): string {
  return (
    {
      accepted: 'bdl-badge bdl-green',
      returned: 'bdl-badge bdl-red',
      uploaded: 'bdl-badge bdl-blue',
      waived: 'bdl-badge bdl-grey',
      requested: 'bdl-badge bdl-amber',
    }[status] || 'bdl-badge bdl-grey'
  )
}

function base(): string {
  return props.baseUrl.replace(/\/$/, '')
}
function jsonHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-XSRF-TOKEN': readXsrfTokenFromCookie(),
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await fetch(base(), { credentials: 'same-origin', headers: jsonHeaders() })
    const body = await res.json()
    requests.value = body?.data ?? []
  } catch (e) {
    emit('error', 'Could not load your documents. Please try again.')
  } finally {
    loading.value = false
  }
}

async function onFile(request: DocRequest, doc: Doc, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  busyId.value = doc.id
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${base()}/${request.id}/documents/${doc.id}/upload`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: jsonHeaders(),
      body: form,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || 'Upload failed')
    }
    await load()
    emit('changed')
  } catch (e: unknown) {
    emit('error', e instanceof Error ? e.message : 'Upload failed')
  } finally {
    busyId.value = null
    input.value = ''
  }
}

async function submit(request: DocRequest): Promise<void> {
  busyId.value = request.id
  try {
    const res = await fetch(`${base()}/${request.id}/submit`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: jsonHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.message || (body?.errors?.submit?.[0] ?? 'Submission failed'))
    }
    await load()
    emit('changed')
  } catch (e: unknown) {
    emit('error', e instanceof Error ? e.message : 'Submission failed')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="bdl-root">
    <h2 v-if="title" class="bdl-title">{{ title }}</h2>
    <p v-if="description" class="bdl-desc">{{ description }}</p>

    <p v-if="loading" class="bdl-muted">Loading…</p>

    <div v-else-if="requests.length === 0" class="bdl-empty">
      No document requests yet. You'll be notified here when documents are requested.
    </div>

    <div v-for="request in requests" :key="request.id" class="bdl-card">
      <div class="bdl-card-head">
        <div>
          <h3 class="bdl-card-title">{{ request.stage_label }}</h3>
          <p class="bdl-ref">
            Ref {{ request.reference }}
            <span v-if="request.due_at"> · Due {{ request.due_at }}</span>
          </p>
        </div>
        <span :class="statusClass(request.status)">{{ request.status.replace(/_/g, ' ') }}</span>
      </div>
      <p v-if="request.message" class="bdl-msg">{{ request.message }}</p>

      <ul class="bdl-list">
        <li v-for="doc in request.documents" :key="doc.id" class="bdl-item">
          <div class="bdl-item-info">
            <p class="bdl-doc-name">
              {{ doc.name }}<span v-if="doc.is_mandatory" class="bdl-req">*</span>
            </p>
            <p v-if="doc.instructions" class="bdl-hint">{{ doc.instructions }}</p>
            <p v-if="doc.officer_comment" class="bdl-officer">Officer: {{ doc.officer_comment }}</p>
            <p v-if="doc.latest_version" class="bdl-hint">
              v{{ doc.latest_version.version }} · {{ doc.latest_version.original_name }}
            </p>
          </div>
          <div class="bdl-item-actions">
            <span :class="statusClass(doc.status)">{{ STATUS_LABELS[doc.status] || doc.status }}</span>
            <label v-if="doc.uploadable" class="bdl-btn bdl-btn-upload">
              {{ doc.latest_version ? 'Replace' : 'Upload' }}
              <input type="file" class="bdl-hidden" :disabled="busyId === doc.id" @change="(e) => onFile(request, doc, e)" />
            </label>
          </div>
        </li>
      </ul>

      <div class="bdl-card-foot">
        <p class="bdl-muted">
          <span v-if="request.outstanding_count > 0">{{ request.outstanding_count }} required document(s) outstanding.</span>
          <span v-else-if="request.submitted_at">Submitted — under review.</span>
          <span v-else>All required documents uploaded.</span>
        </p>
        <button v-if="request.can_submit" type="button" class="bdl-btn bdl-btn-submit" :disabled="busyId === request.id" @click="submit(request)">
          Submit documents
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bdl-root { max-width: 56rem; margin: 0 auto; }
.bdl-title { font-size: 1.5rem; font-weight: 600; color: #111827; }
.bdl-desc { margin-top: 0.25rem; font-size: 0.875rem; color: #4b5563; }
.bdl-muted { font-size: 0.75rem; color: #6b7280; }
.bdl-empty { margin-top: 2rem; border: 1px dashed #d1d5db; border-radius: 0.5rem; padding: 2rem; text-align: center; color: #6b7280; }
.bdl-card { margin-top: 1.5rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.bdl-card-head { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #e5e7eb; }
.bdl-card-title { font-weight: 500; color: #111827; }
.bdl-ref { font-size: 0.75rem; color: #6b7280; }
.bdl-msg { padding: 0.5rem 1.25rem 0; font-size: 0.875rem; color: #4b5563; }
.bdl-list { list-style: none; margin: 0; padding: 0; }
.bdl-item { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-top: 1px solid #f3f4f6; }
.bdl-item-info { min-width: 0; }
.bdl-doc-name { font-size: 0.875rem; font-weight: 500; color: #111827; }
.bdl-req { color: #ef4444; }
.bdl-hint { font-size: 0.75rem; color: #6b7280; }
.bdl-officer { font-size: 0.75rem; color: #dc2626; }
.bdl-item-actions { display: flex; align-items: center; gap: 0.75rem; }
.bdl-card-foot { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.25rem; border-top: 1px solid #e5e7eb; background: #f9fafb; }
.bdl-badge { border-radius: 9999px; padding: 0.15rem 0.6rem; font-size: 0.7rem; font-weight: 500; }
.bdl-green { background: #dcfce7; color: #15803d; }
.bdl-red { background: #fee2e2; color: #b91c1c; }
.bdl-blue { background: #dbeafe; color: #1d4ed8; }
.bdl-amber { background: #fef3c7; color: #b45309; }
.bdl-grey { background: #f3f4f6; color: #4b5563; }
.bdl-btn { border-radius: 0.375rem; padding: 0.4rem 0.9rem; font-size: 0.8rem; font-weight: 500; cursor: pointer; border: none; }
.bdl-btn-upload { background: #4f46e5; color: #fff; }
.bdl-btn-submit { background: #16a34a; color: #fff; }
.bdl-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.bdl-hidden { display: none; }
</style>
