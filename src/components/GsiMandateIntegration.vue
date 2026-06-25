<template>
  <div class="gsi-mandate">
    <!-- Confirmed state -->
    <div
      v-if="confirmed"
      class="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200"
    >
      <!-- check-circle -->
      <svg class="h-5 w-5 text-green-600 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
      <div>
        <p class="text-sm font-semibold text-green-800">
          GSI mandate authorized &#10003;
        </p>
        <p v-if="mandateId" class="text-xs text-green-700 mt-0.5 break-all">
          Mandate ID: {{ mandateId }}
        </p>
      </div>
    </div>

    <!-- Pending / action state -->
    <div v-else>
      <button
        type="button"
        :disabled="isDisabled"
        @click="authorize"
        class="inline-flex items-center px-4 py-2 bg-primary border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition ease-in-out duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <!-- spinner -->
        <svg
          v-if="busy"
          class="animate-spin -ml-0.5 mr-2 h-3.5 w-3.5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <!-- document/signature icon -->
        <svg v-else class="mr-2 h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
        {{ inFlight ? 'Starting…' : polling ? 'Waiting for authorization…' : 'Authorize GSI Mandate' }}
      </button>

      <p v-if="polling" class="mt-2 text-xs text-gray-600">
        A new tab was opened for you to authorize the mandate at your bank.
        This panel will update automatically once authorization is confirmed.
      </p>

      <p v-if="status && !confirmed" class="mt-1 text-xs text-gray-500">
        Current status: {{ status }}
      </p>
    </div>

    <p v-if="localError" class="mt-2 text-xs text-red-600">
      {{ localError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

/**
 * GSI / Mono direct-debit mandate authorization widget (app-agnostic).
 *
 * Talks to the boi-api mandate endpoints via the SAME proxy/axios mechanism the
 * bank-statement / eDoc integration uses:
 *   - base URL: `resolveBoiApiBaseUrl({ boiProxy })` (passed in as `boiApiBaseUrl`)
 *   - axios:    an axios-like client (passed in as `api`, shape { get, post })
 *
 * Endpoints (NOT blocked by RejectBlockedBoiProxyPaths):
 *   POST {base}/mandates/initiate    -> { success, data: { mandateId, authorizationUrl, status } }
 *   GET  {base}/mandates/{id}/status -> { success, data: { mandateId, status, confirmed } }
 *
 * The Global-Standing (sweep) mandate's authoritative "ready" signal is async (Mono
 * sends events.mandates.ready up to 24 h later, handled by the consumer app's
 * /webhooks/mono endpoint). The poll below gives early in-session feedback; if it
 * times out the webhook still finalizes.
 */

export interface GsiApplicant {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  bvn?: string
  address?: string
}

export interface GsiAccount {
  accountNumber?: string
  bankCode?: string
}

export interface GsiMandateValue {
  mandateId?: string
  status?: string
  confirmed?: boolean
}

/** Minimal axios-like client. */
export interface GsiApiClient {
  get: (url: string) => Promise<unknown>
  post: (url: string, body?: unknown) => Promise<unknown>
}

const props = withDefaults(
  defineProps<{
    /** Mono needs BVN-level KYC to create the customer before the mandate. */
    applicant: GsiApplicant
    account: GsiAccount
    /** Loan amount (naira) the mandate authorizes; boi-api converts to kobo. */
    amount?: number | string
    modelValue?: GsiMandateValue
    disabled?: boolean
    /** Same base URL the bank-statement integration uses (resolveBoiApiBaseUrl). */
    boiApiBaseUrl?: string
    /** Axios-like client { get, post } — pass apiNoReload (mirrors BankStatements). */
    api: GsiApiClient
  }>(),
  {
    amount: 0,
    modelValue: () => ({ mandateId: '', status: '', confirmed: false }),
    disabled: false,
    boiApiBaseUrl: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: GsiMandateValue]
  error: [message: string]
}>()

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 45 // ~3 minutes

const inFlight = ref(false)
const polling = ref(false)
const localError = ref('')
const pollCount = ref(0)
let pollTimer: ReturnType<typeof setTimeout> | null = null

const confirmed = computed(() => !!props.modelValue?.confirmed)
const mandateId = computed(() => props.modelValue?.mandateId || '')
const status = computed(() => props.modelValue?.status || '')

const busy = computed(() => inFlight.value || polling.value)
const isDisabled = computed(() => props.disabled || busy.value)

/** boi-api responses are wrapped: { success, data } — sometimes nested under .data (axios). */
function unwrap(res: unknown): Record<string, unknown> {
  const outer = res as { data?: unknown } | null | undefined
  const body = (outer?.data ?? res) as Record<string, unknown> | null | undefined
  if (body && typeof body === 'object' && 'data' in body) {
    return (body.data ?? {}) as Record<string, unknown>
  }
  return (body ?? {}) as Record<string, unknown>
}

function base(): string {
  return String(props.boiApiBaseUrl || '').replace(/\/+$/, '')
}

function stopPolling(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

function setError(message: string): void {
  localError.value = message
  if (message) emit('error', message)
}

interface ValidatedFields {
  accountNumber: string
  bankCode: string
  bvn: string
  phone: string
  address: string
}

function validate(): ValidatedFields | null {
  const accountNumber = String(props.account?.accountNumber || '').trim()
  const bankCode = String(props.account?.bankCode || '').trim()
  const bvn = String(props.applicant?.bvn || '').trim()
  const phone = String(props.applicant?.phone || '').trim()
  const address = String(props.applicant?.address || '').trim()

  if (!/^\d{10}$/.test(accountNumber)) {
    setError('A valid 10-digit account number is required to authorize the GSI mandate.')
    return null
  }
  if (!bankCode) {
    setError('A bank could not be resolved for this account. Please select/verify the account first.')
    return null
  }
  if (!/^\d{11}$/.test(bvn)) {
    setError('Your 11-digit BVN is required to set up the GSI mandate. Add it under the shareholder/owner details first.')
    return null
  }
  if (!phone) {
    setError('A phone number is required to set up the GSI mandate. Please complete your contact details first.')
    return null
  }
  if (!address) {
    setError('A home/business address is required to set up the GSI mandate. Please complete your details first.')
    return null
  }
  return { accountNumber, bankCode, bvn, phone, address }
}

async function pollOnce(id: string): Promise<void> {
  if (!polling.value) return
  pollCount.value += 1

  try {
    const res = await props.api.get(`${base()}/mandates/${encodeURIComponent(id)}/status`)
    const data = unwrap(res)

    if (data.confirmed === true) {
      stopPolling()
      emit('update:modelValue', {
        mandateId: (data.mandateId as string) || id,
        status: (data.status as string) || 'confirmed',
        confirmed: true,
      })
      setError('')
      return
    }

    // Keep the latest non-confirmed status visible in the form data.
    if (data.status && data.status !== status.value) {
      emit('update:modelValue', {
        mandateId: (data.mandateId as string) || id,
        status: data.status as string,
        confirmed: false,
      })
    }
  } catch {
    // Transient errors should not abort the whole flow; keep polling until the cap.
    // (e.g. status endpoint briefly 5xx, or the mandate not yet visible.)
  }

  if (pollCount.value >= MAX_POLLS) {
    stopPolling()
    setError(
      'Authorization is still being confirmed by your bank. If you completed the steps, this will finalize automatically — save and check back shortly. Otherwise, try again.',
    )
    return
  }

  pollTimer = setTimeout(() => pollOnce(id), POLL_INTERVAL_MS)
}

async function authorize(): Promise<void> {
  if (isDisabled.value) return
  setError('')

  const validated = validate()
  if (!validated) return

  inFlight.value = true
  try {
    const res = await props.api.post(`${base()}/mandates/initiate`, {
      email: String(props.applicant?.email || '').trim(),
      firstName: String(props.applicant?.firstName || '').trim(),
      lastName: String(props.applicant?.lastName || '').trim(),
      phone: validated.phone,
      bvn: validated.bvn,
      address: validated.address,
      accountNumber: validated.accountNumber,
      bankCode: validated.bankCode,
      amount: Number(props.amount) || undefined,
    })

    const data = unwrap(res)
    const id = data.mandateId as string | undefined
    const authorizationUrl = data.authorizationUrl as string | undefined

    if (!id || !authorizationUrl) {
      setError('Could not start the GSI mandate authorization. Please try again.')
      return
    }

    // Persist the pending mandate id/status immediately so it is not lost on reload.
    emit('update:modelValue', {
      mandateId: id,
      status: (data.status as string) || 'pending',
      confirmed: false,
    })

    // Open the bank authorization page in a new tab for the applicant.
    window.open(authorizationUrl, '_blank', 'noopener,noreferrer')

    // Begin polling for confirmation. If the popup is closed we just let it timeout.
    pollCount.value = 0
    polling.value = true
    pollTimer = setTimeout(() => pollOnce(id), POLL_INTERVAL_MS)
  } catch (e) {
    const err = e as { response?: { data?: { message?: string; error?: string } }; message?: string }
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Failed to initiate the GSI mandate.'
    setError(msg)
  } finally {
    inFlight.value = false
  }
}

onBeforeUnmount(() => {
  stopPolling()
})
</script>
