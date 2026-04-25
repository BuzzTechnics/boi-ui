<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { BankStatementRecord, BankOption, IndustrialSectorOption } from '../types/edoc'
import { useEdocBanks } from '../composables/useEdocBanks'
import { useAccountVerification } from '../composables/useAccountVerification'
import { bankStatementsApi } from '../api/bankStatements'
import { edocApi } from '../api/edoc'
import Button from './Button.vue'
import BankSelect from './BankSelect.vue'
import EmtsIntegration from './EmtsIntegration.vue'
import FileInput from './FileInput.vue'
import EdocProcessingSpinner from './EdocProcessingSpinner.vue'
import type { VerifyBankAccountFn } from '../composables/useAccountVerification'
import { edocRowMatchesLocalBank } from '../utils/bankCodesEquivalent'

const props = withDefaults(
  defineProps<{
    applicationId?: string
    api: {
      get: (url: string) => Promise<{ data?: unknown }>
      post: (url: string, data?: unknown, config?: unknown) => Promise<{ data?: unknown }>
      put: (url: string, data?: unknown) => Promise<{ data?: unknown }>
      delete: (url: string) => Promise<{ data?: unknown }>
    }
    bankOptions: BankOption[]
    formData: { email?: string; industrial_sector_id?: string | number }
    industrialSectorOptions?: IndustrialSectorOption[]
    /** Legacy: only prefixes bank-statement CRUD paths. Prefer integrationBaseUrl. */
    baseUrl?: string
    /** When set (e.g. deployed boi-api origin), prefixes bank statements, EDOC, and file upload URLs. */
    integrationBaseUrl?: string
    isFormDisabled?: boolean
    maxAccounts?: number
    /** When provided, account name is resolved from account number + bank (e.g. GET /api/verify-bank?account_number=&bank_code=) */
    verifyBankAccount?: VerifyBankAccountFn | null
    /** Call when user focuses into this form so parent can block auto-save */
    blockAutoSave?: () => void
    /** Call when user focuses out so parent can unblock auto-save */
    unblockAutoSave?: () => void
    /** When false, do not poll for EDOC status (stops repeated GET list calls). Set false when upload-to-edoc is disabled. */
    pollEdocStatus?: boolean
    /** Extra query params for manual bank_statement PDF “View document” (e.g. `{ tid: '…' }` for boi-api store scope). */
    fileViewExtraParams?: Record<string, string>
  }>(),
  {
    baseUrl: '',
    integrationBaseUrl: '',
    isFormDisabled: false,
    maxAccounts: 5,
    verifyBankAccount: null,
    pollEdocStatus: true,
    fileViewExtraParams: () => ({}),
  }
)

const emit = defineEmits<{
  'error': [message: string]
}>()

function withIntegrationOrigin(path: string): string {
  const b = (props.integrationBaseUrl ?? '').replace(/\/$/, '')
  if (!b) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

const {
  edocBanks,
  loadBanksForStatement,
  loading: loadingEdocBanks,
  error: edocBanksError,
} = useEdocBanks({
  get: props.api.get,
  getBanksUrl: () => withIntegrationOrigin(edocApi.getBanks()),
})

const {
  handleAccountVerification,
  retryVerification,
  getVerificationState,
} = useAccountVerification(() => props.verifyBankAccount)

const activeIndex = ref(0)
const errorMessage = ref('')
const showEdocBanksList = ref(false)
const rootRef = ref<HTMLFieldSetElement | null>(null)

function onFocusIn() {
  props.blockAutoSave?.()
}

function onFocusOut() {
  setTimeout(() => {
    const el = rootRef.value
    if (el && !el.contains(document.activeElement)) {
      props.unblockAutoSave?.()
    }
  }, 0)
}
const bankStatements = ref<BankStatementRecord[]>([])
const loadingStatements = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const statementsUrlPrefix = computed(
  () => props.integrationBaseUrl?.replace(/\/$/, '') || props.baseUrl?.replace(/\/$/, '') || ''
)

const urls = computed(() =>
  props.applicationId ? bankStatementsApi.urls(props.applicationId, statementsUrlPrefix.value) : null
)

/** Same base as host `FileInput` + `boiFilesApiBase`: `{integrationBaseUrl}/api/files/*` (browser proxy to boi-api). */
const filesApiBase = computed(() => (props.integrationBaseUrl ?? '').replace(/\/$/, ''))

const fileUploadUrl = computed(() => {
  const b = filesApiBase.value
  return b ? `${b}/api/files/upload` : undefined
})

const fileViewApiBase = computed(() => filesApiBase.value)

const limitedStatements = computed(() =>
  bankStatements.value.slice(0, props.maxAccounts)
)

const canAddAccount = computed(() => bankStatements.value.length < props.maxAccounts)
const canRemoveAccount = computed(() => bankStatements.value.length > 0)
const companyEmail = computed(() => props.formData?.email ?? '')

function getIndustrialSectorName(): string | undefined {
  const id = props.formData?.industrial_sector_id
  if (id == null) return undefined
  const opt = props.industrialSectorOptions?.find(
    (s) => s.value === id || s.id === id || s.value === String(id)
  )
  return opt?.label ?? opt?.name
}

/** EDOC CSV copy on S3 — not the user’s uploaded PDF path. */
function isEdocCsvStorageKey(path: string | undefined | null): boolean {
  if (path == null || path === '') return false
  const p = path.trim().toLowerCase()
  return p.includes('edoc/statements/') && p.endsWith('.csv')
}

function initialUploadedStatementPath(bankStatement: string | undefined | null): string {
  const b = (bankStatement ?? '').trim()
  if (!b || isEdocCsvStorageKey(b)) return ''
  return b
}

/** Storage key for “View document” (uploaded PDF), even if `bank_statement` later holds the CSV key. */
function statementViewStoragePath(account: BankStatementRecord): string {
  const u = account.uploaded_statement_path?.trim()
  if (u) return u
  const b = account.bank_statement?.trim() ?? ''
  if (b && !isEdocCsvStorageKey(b)) return b
  return ''
}

function getStatementLabel(account: BankStatementRecord, index: number): string {
  const bank = props.bankOptions.find((b) => String(b.value) === String(account.bank))?.label ?? ''
  const num = account.account_number ?? ''
  if (bank && num) return `${bank} (${num})`
  if (bank) return bank
  if (num) return `Account (${num})`
  return `Account ${index + 1}`
}

function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-800',
    processing: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }
  return map[status] ?? map.pending
}

async function loadBankStatements() {
  if (!urls.value) return
  try {
    loadingStatements.value = true
    const res = await props.api.get(urls.value.index)
    const data = res?.data as { success?: boolean; data?: BankStatementRecord[] }
    if (data?.success && Array.isArray(data.data)) {
      bankStatements.value = data.data.map((s) => ({
        ...s,
        otp: '',
        showOtpInput: false,
        uploaded_statement_path: initialUploadedStatementPath(s.bank_statement),
      }))
    }
  } catch (e) {
    console.error('Failed to load bank statements', e)
  } finally {
    loadingStatements.value = false
  }
}

async function syncStatementsFromPoll() {
  if (!urls.value) return
  try {
    const res = await props.api.get(urls.value.index)
    const data = res?.data as { success?: boolean; data?: BankStatementRecord[] }
    if (!data?.success || !Array.isArray(data.data)) return
    const fields = ['edoc_status', 'consent_id', 'csv_url', 'statement_generated'] as const
    bankStatements.value = bankStatements.value.map((existing) => {
      const apiRow = data.data!.find((s) => s.id === existing.id)
      if (!apiRow) return existing
      const updates: Partial<BankStatementRecord> = {}
      for (const key of fields) {
        if (!(key in apiRow)) continue
        const v = apiRow[key]
        // Avoid wiping in-memory EDOC consent before the server has persisted it (e.g. mid–OTP flow).
        if (key === 'consent_id' && (v === null || v === '') && existing.consent_id) {
          continue
        }
        ;(updates as Partial<Record<(typeof fields)[number], unknown>>)[key] = v
      }
      let uploadedPath = existing.uploaded_statement_path ?? ''
      if ('bank_statement' in apiRow && apiRow.bank_statement !== undefined) {
        const incoming = String(apiRow.bank_statement ?? '')
        ;(updates as Record<string, unknown>).bank_statement = apiRow.bank_statement
        if (incoming && !isEdocCsvStorageKey(incoming)) {
          uploadedPath = incoming
        } else if (incoming && isEdocCsvStorageKey(incoming) && uploadedPath) {
          // keep uploaded PDF path for View document
        } else if (!incoming) {
          uploadedPath = ''
        }
      }
      updates.uploaded_statement_path = uploadedPath
      return { ...existing, ...updates }
    })
  } catch (e) {
    console.error('Sync statements failed', e)
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    const hasProcessing = bankStatements.value.some((s) => s.edoc_status === 'processing')
    if (!hasProcessing) {
      stopPolling()
      return
    }
    syncStatementsFromPoll()
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => bankStatements.value.some((s) => s.edoc_status === 'processing'),
  (hasProcessing) => {
    if (!props.pollEdocStatus) {
      stopPolling()
      return
    }
    if (hasProcessing) startPolling()
    else stopPolling()
  }
)

async function saveStatement(statement: BankStatementRecord) {
  if (!urls.value || statement.id < 0) return
  try {
    await props.api.put(urls.value.update(statement.id), {
      bank: statement.bank,
      account_number: statement.account_number,
      account_name: statement.account_name,
      account_type: statement.account_type,
      bvn: statement.bvn,
      email: statement.email,
      bank_statement: statement.bank_statement,
      consent_id: statement.consent_id?.trim() || null,
    })
  } catch (e) {
    console.error('Failed to save bank statement', e)
  }
}

async function handleAddAccount() {
  if (!urls.value || !canAddAccount.value) return
  const tempId = -Date.now()
  const newRecord: BankStatementRecord = {
    id: tempId,
    loan_application_id: Number(props.applicationId),
    bank: '',
    account_number: '',
    account_name: '',
    account_type: '',
    bvn: '',
    email: companyEmail.value,
    bank_statement: '',
    csv_url: '',
    consent_id: '',
    edoc_status: 'pending',
    statement_generated: false,
    otp: '',
    showOtpInput: false,
    uploaded_statement_path: '',
  }
  bankStatements.value.push(newRecord)
  activeIndex.value = bankStatements.value.length - 1

  try {
    const res = await props.api.post(urls.value.store, { email: companyEmail.value })
    const data = res?.data as { success?: boolean; data?: BankStatementRecord }
    if (data?.success && data.data) {
      const idx = bankStatements.value.findIndex((s) => s.id === tempId)
      if (idx !== -1) {
        bankStatements.value[idx] = {
          ...data.data,
          otp: '',
          showOtpInput: false,
          uploaded_statement_path: initialUploadedStatementPath(data.data.bank_statement),
        }
      }
    } else {
      bankStatements.value = bankStatements.value.filter((s) => s.id !== tempId)
      activeIndex.value = Math.max(0, bankStatements.value.length - 1)
    }
  } catch (e) {
    bankStatements.value = bankStatements.value.filter((s) => s.id !== tempId)
    activeIndex.value = Math.max(0, bankStatements.value.length - 1)
    emit('error', (e as Error)?.message ?? 'Failed to add account')
  }
}

async function handleRemoveAccount(statement: BankStatementRecord) {
  if (!urls.value) return
  const removedIndex = bankStatements.value.findIndex((s) => s.id === statement.id)
  const removed = { ...statement }
  const isOptimistic = statement.id < 0
  bankStatements.value = bankStatements.value.filter((s) => s.id !== statement.id)
  activeIndex.value = Math.min(activeIndex.value, Math.max(0, bankStatements.value.length - 1))

  if (isOptimistic) return
  try {
    await props.api.delete(urls.value.destroy(statement.id))
  } catch (e) {
    bankStatements.value = bankStatements.value
      .slice(0, removedIndex)
      .concat(removed, bankStatements.value.slice(removedIndex))
    emit('error', (e as Error)?.message ?? 'Failed to remove account')
  }
}

function onConsentId(statement: BankStatementRecord, consentId: string) {
  statement.consent_id = consentId
  statement.showOtpInput = true
  saveStatement(statement)
}

function onStatementRetrieved(statement: BankStatementRecord, updated: BankStatementRecord) {
  Object.assign(statement, updated)
  saveStatement(statement)
}

function onEdocError(msg: string) {
  errorMessage.value = msg
  emit('error', msg)
}

function clearError() {
  errorMessage.value = ''
}

function createAfterUpload(statement: BankStatementRecord) {
  return async (filePath: string) => {
    if (!urls.value) return
    statement.uploaded_statement_path = filePath.trim()
    await saveStatement(statement)
    props.blockAutoSave?.()
    statement.edoc_status = 'processing'
    const sector = getIndustrialSectorName()
    const unblockAfterDelay = () => {
      setTimeout(() => props.unblockAutoSave?.(), 3000)
    }
    props.api
      .post(urls.value.uploadToEdoc(statement.id), { filePath, industrialSector: sector })
      .then((res) => {
        const data = (res?.data as { data?: BankStatementRecord })?.data
        if (data) {
          const preservedPdfPath = statement.uploaded_statement_path ?? ''
          Object.assign(statement, data)
          if (
            preservedPdfPath &&
            data.bank_statement &&
            isEdocCsvStorageKey(String(data.bank_statement))
          ) {
            statement.uploaded_statement_path = preservedPdfPath
          }
        }
        startPolling()
      })
      .catch(() => {
        statement.edoc_status = 'failed'
      })
      .finally(unblockAfterDelay)
  }
}

const isBankEdocSupported = (bankCode: string): boolean => {
  if (!bankCode || !edocBanks.value.length) return false
  const bank =
    props.bankOptions.find((o) => String(o.value) === String(bankCode)) ??
    props.bankOptions.find((o) => String(o.label) === String(bankCode)) ??
    props.bankOptions.find((o) => (o.shortName ? String(o.shortName) === String(bankCode) : false)) ??
    null

  const localCode = bank?.value ?? bankCode
  const names = [bank?.label ?? '', ...(bank?.searchKeywords ?? [])].filter(Boolean)
  const edocBankId = bank?.edocBankId ?? null
  const matched = edocBanks.value.some((b) =>
    edocRowMatchesLocalBank(
      String(localCode),
      b as unknown as Record<string, unknown>,
      names,
      true,
      edocBankId
    )
  )

  return matched
}

const enabledEdocBanksList = computed(() =>
  (edocBanks.value || [])
    .filter((b) => b.enabled !== false)
    .map((b) => b.name || b.bankCode || 'Unknown')
    .sort((a, b) => a.localeCompare(b))
)

onMounted(async () => {
  loadBanksForStatement()
  if (props.applicationId) {
    await loadBankStatements()
  }
})

onUnmounted(() => {
  stopPolling()
})

// (Debug logs removed) keep this component purely UI/state driven.
</script>

<template>
  <fieldset
    ref="rootRef"
    :disabled="isFormDisabled"
    class="grid boi-bank-statement-integration w-full max-w-full overflow-x-hidden rounded-xl bg-white shadow-sm"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <div class="border-b border-gray-100 px-4 py-3 md:px-6 md:py-4">
      <h2 class="text-lg font-bold text-slate-900">Company Bank Statements</h2>
    </div>

    <div class="min-w-0 pb-4 md:px-6 md:pb-6">
      <!-- Info: Electronic statement retrieval -->
      <div class="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm sm:p-4">
        <div class="flex flex-col gap-2 text-blue-900 sm:block">
          <p class="leading-relaxed">
            Some banks support <strong>Electronic Bank Statement Retrieval</strong>, so you may not need to upload a PDF.
            <span v-if="!showEdocBanksList" class="sm:inline"> supported banks.</span>
          </p>
          <button
            type="button"
            @click="showEdocBanksList = !showEdocBanksList"
            class="self-start rounded font-semibold text-blue-700 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:ml-1 sm:inline"
          >
            {{ showEdocBanksList ? 'Hide supported banks' : 'See supported banks' }}
          </button>
        </div>
        <div v-if="showEdocBanksList && enabledEdocBanksList.length" class="mt-3 rounded-md border border-blue-100 bg-white/80 p-3">
          <p class="mb-2 text-xs font-semibold text-blue-900">Banks that support electronic statement retrieval:</p>
          <ul class="list-inside list-disc space-y-0.5 text-xs text-blue-800 sm:columns-2 sm:gap-x-4">
            <li v-for="(name, idx) in enabledEdocBanksList" :key="idx">{{ name }}</li>
          </ul>
        </div>
        <p v-else-if="showEdocBanksList && loadingEdocBanks" class="mt-2 text-xs text-blue-700">
          Loading supported banks…
        </p>
        <p v-else-if="showEdocBanksList && edocBanksError" class="mt-2 text-xs text-red-700">
          Could not load the EDOC bank list. Check boi-api / <code class="rounded bg-red-50 px-0.5">/api/boi-api</code> proxy and network errors.
        </p>
        <p v-else-if="showEdocBanksList && !enabledEdocBanksList.length" class="mt-2 text-xs text-blue-700">
          No banks are returned for electronic retrieval (EDOC list is empty on the API).
        </p>
      </div>

      <!-- Loading state -->
      <div v-if="loadingStatements" class="flex items-center justify-center py-10">
        <EdocProcessingSpinner :size="20" class="mr-2 text-slate-600" />
        <span class="text-sm text-slate-600">Loading bank statements…</span>
      </div>

      <template v-else>
        <!-- Account tabs -->
        <div v-if="limitedStatements.length" class="flex w-full max-w-full snap-x snap-mandatory gap-1 overflow-x-auto pb-2 whitespace-nowrap [touch-action:pan-x] [-webkit-overflow-scrolling:touch]">
          <button
            v-for="(account, index) in limitedStatements"
            :key="account.id"
            type="button"
            :title="getStatementLabel(account, index)"
            class="snap-start max-w-[85vw] shrink-0 truncate whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:max-w-none"
            :class="
              activeIndex === index
                ? 'border-2 border-primary bg-primary text-white shadow-sm'
                : 'border-2 border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            "
            @click="activeIndex = index"
          >
            {{ getStatementLabel(account, index) }}
          </button>
        </div>

        <!-- Active account card -->
        <div
          v-for="(account, index) in limitedStatements"
          :key="account.id"
          v-show="activeIndex === index"
          class="mt-6 space-y-6 rounded-xl border border-gray-100 bg-gray-50/50 py-4 md:py-6"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h4
              :title="getStatementLabel(account, index)"
              class="min-w-0 flex-1 truncate border-b-2 border-primary pb-1 text-base font-semibold text-slate-900"
            >
              {{ getStatementLabel(account, index) }}
            </h4>
            <button
              type="button"
              class="inline-flex shrink-0 items-center self-start rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 sm:self-auto"
              :disabled="!canRemoveAccount || isFormDisabled"
              @click="handleRemoveAccount(account)"
            >
              <svg class="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span class="hidden sm:inline">Remove account</span>
              <span class="sm:hidden">Remove</span>
            </button>
          </div>

          <!-- Bank / account fields -->
          <slot name="account-fields" :account="account" :bank-options="bankOptions" :verification-state="getVerificationState(account)" :on-verify="() => handleAccountVerification(account)" :on-retry="() => retryVerification(account)">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Bank</label>
                <BankSelect
                  :model-value="account.bank"
                  :options="bankOptions"
                  placeholder="Select bank"
                  :disabled="!!isFormDisabled"
                  @update:model-value="(v) => { account.bank = v; handleAccountVerification(account); saveStatement(account); }"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Account number</label>
                <input
                  v-model="account.account_number"
                  type="text"
                  maxlength="10"
                  inputmode="numeric"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="10 digits"
                  @blur="handleAccountVerification(account); saveStatement(account)"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700">Account name</label>
                <input
                  :value="account.account_name"
                  type="text"
                  readonly
                  class="w-full cursor-default rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
                  placeholder="Enter bank and account number to verify"
                />
                <div v-if="verifyBankAccount" class="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <span v-if="getVerificationState(account).isLoading" class="text-blue-600">Verifying…</span>
                  <span v-else-if="getVerificationState(account).isSuccess" class="text-green-600">Account verified</span>
                  <span v-else-if="getVerificationState(account).isError" class="flex items-center gap-1">
                    <span class="text-red-600">{{ getVerificationState(account).errorMessage }}</span>
                    <button type="button" class="rounded px-2 py-0.5 text-gray-600 hover:bg-gray-100" @click="retryVerification(account)">Retry</button>
                  </span>
                </div>
              </div>
            </div>
          </slot>

          <div v-if="isBankEdocSupported(account.bank)" class="boi-emts-wrapper">
            <EmtsIntegration
              :account="account"
              :edoc-banks="edocBanks"
              :bank-options="bankOptions"
              :api="{ get: api.get, post: api.post }"
              :company-email="companyEmail"
              :industrial-sector="getIndustrialSectorName()"
              :application-id="applicationId"
              :integration-base-url="integrationBaseUrl"
              :disabled="isFormDisabled"
              @update:consent-id="onConsentId(account, $event)"
              @statement-retrieved="onStatementRetrieved(account, $event)"
              @error="onEdocError"
            />
            <!-- Success state is rendered inside EmtsIntegration -->
          </div>

          <div v-if="!isBankEdocSupported(account.bank)" class="rounded-lg border border-gray-200 bg-white p-4">
            <p class="mb-3 text-sm font-medium text-gray-700">Upload bank statement (PDF)</p>
            <slot name="file-upload" :account="account" :after-upload="createAfterUpload(account)">
              <FileInput
                v-model="account.bank_statement"
                :view-storage-path="statementViewStoragePath(account)"
                :view-extra-params="fileViewExtraParams"
                :post="(url, body, opts) => api.post(url, body, opts)"
                :upload-url="fileUploadUrl"
                :view-api-base="fileViewApiBase || undefined"
                placeholder="Choose 12 months bank statement (PDF)"
                accept=".pdf"
                :max-size="20 * 1024 * 1024"
                :allowed-types="['application/pdf']"
                upload-context="bank_statement"
                :after-upload="createAfterUpload(account)"
                :disabled="isFormDisabled"
              />
               <!-- Status -->
          <div class="rounded-lg py-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-600">Bank statement status:</span>
              <span
                :class="[getStatusClass(account.edoc_status || 'pending'), 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium capitalize']"
              >
                <EdocProcessingSpinner v-if="account.edoc_status === 'processing'" :size="14" />
                {{ account.edoc_status || 'pending' }}
              </span>
            </div>
            <p v-if="account.edoc_status === 'processing'" class="mt-1.5 text-sm text-amber-700">
              Processing in progress. Please wait…
            </p>
            <p v-if="account.edoc_status === 'failed'" class="mt-1.5 text-sm text-red-600">
              Processing failed. Please make sure you have filled in your bank details above, plus added a valid statement, and try again.
            </p>
          </div>
            </slot>
          </div>

         

          <div v-if="errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <p class="flex-1 text-sm text-red-800">{{ errorMessage }}</p>
            <button type="button" class="shrink-0 rounded p-1 text-red-600 hover:bg-red-100" @click="clearError" aria-label="Dismiss">×</button>
          </div>
        </div>

        <div class="flex justify-center">
          <Button
            type="button"
            variant="default"
            size="lg"
            :disabled="!canAddAccount || isFormDisabled || !applicationId"
            @click="handleAddAccount"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add account
          </Button>
        </div>
      </template>
    </div>
  </fieldset>
</template>
