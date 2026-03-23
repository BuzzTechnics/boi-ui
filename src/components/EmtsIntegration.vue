<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BankStatementRecord, EdocBank, BankOption } from '../types/edoc'
import { edocApi } from '../api/edoc'
import { edocRowMatchesLocalBank } from '../utils/bankCodesEquivalent'

const props = withDefaults(
  defineProps<{
    account: BankStatementRecord
    edocBanks: EdocBank[]
    bankOptions: BankOption[]
    api: { post: (url: string, data: unknown) => Promise<{ data?: unknown }>; get?: (url: string) => Promise<{ data?: unknown }> }
    companyEmail?: string
    industrialSector?: string
    applicationId?: string | number
    disabled?: boolean
    /** Prefix for EDOC API paths when using a standalone service (e.g. boi-api). */
    integrationBaseUrl?: string
  }>(),
  { disabled: false, integrationBaseUrl: '' }
)

function edocPath(path: string): string {
  const b = (props.integrationBaseUrl ?? '').replace(/\/$/, '')
  if (!b) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

const emit = defineEmits<{
  'update:consentId': [consentId: string]
  'statement-retrieved': [statement: BankStatementRecord]
  'error': [message: string]
}>()

const generatingStatement = ref(false)
const submittingOtp = ref(false)

function getSanitizedAccountNumber(accountNumber: string | undefined): string {
  // EDOC + backend validation expects exactly 10 digits. Users may type spaces or other chars.
  return String(accountNumber ?? '').replace(/\D/g, '')
}

function bankNames(bankCode: string): string[] {
  const b =
    props.bankOptions.find((o) => String(o.value) === String(bankCode)) ??
    props.bankOptions.find((o) => String(o.label) === String(bankCode)) ??
    props.bankOptions.find((o) => (o.shortName ? String(o.shortName) === String(bankCode) : false)) ??
    null
  return [b?.label ?? '', ...(b?.searchKeywords ?? [])].filter(Boolean)
}

function matchBank(bankCode: string, enabledOnly = false): EdocBank | undefined {
  if (!bankCode || !props.edocBanks.length) return undefined
  const localBank =
    props.bankOptions.find((o) => String(o.value) === String(bankCode)) ??
    props.bankOptions.find((o) => String(o.label) === String(bankCode)) ??
    props.bankOptions.find((o) => (o.shortName ? String(o.shortName) === String(bankCode) : false)) ??
    null
  const localCode = localBank?.value ?? bankCode
  const names = bankNames(bankCode)

  const matched = props.edocBanks.find((b) =>
    edocRowMatchesLocalBank(String(localCode), b as unknown as Record<string, unknown>, names, enabledOnly)
  )

  return matched
}

const getEdocBank = (code: string) => matchBank(code, false)
const isBankEdocSupported = (code: string) => !!matchBank(code, true)
const hasBankInstructions = computed(() => !!getEdocBank(props.account.bank)?.bankInstructions?.length)
const canRequestOtp = computed(() => {
  const a = props.account
  const digits = getSanitizedAccountNumber(a.account_number)
  return !!a.bank && digits.length === 10 && !generatingStatement.value && !submittingOtp.value
})

const canRetrieveStatement = computed(() => {
  const digits = getSanitizedAccountNumber(props.account.account_number)
  return !!props.account.bank && digits.length === 10 && !submittingOtp.value
})
const canSubmitOtp = computed(() => !!props.account.otp && !submittingOtp.value)

const errMsg = (e: unknown) =>
  (e as { response?: { data?: { message?: string } }; data?: { message?: string }; message?: string })?.response?.data?.message ??
  (e as { data?: { message?: string } })?.data?.message ??
  (e as Error)?.message ??
  'An unexpected error occurred'

const consentPayload = (email: string) => ({
  email,
  referenceId: `loan_${props.applicationId ?? 'new'}_${props.account.id}`,
  firstName: 'Company',
  lastName: 'Account',
  state: 'Lagos',
  fundType: 'online portal',
  statementDuration: '12',
  redirectionUrl: typeof window !== 'undefined' ? window.location.origin + '/loan-application' : '',
  industrialSector: props.industrialSector ?? undefined,
})

async function consentAndAttach(edocBank: EdocBank, accountNumberDigits: string) {
  const email = props.account.email || props.companyEmail || ''
  const res = await props.api.post(edocPath(edocApi.initializeConsent()), consentPayload(email))
  const data = res?.data as { success?: boolean; data?: { data?: { consentId?: string } }; message?: string }
  if (!data?.success) throw new Error(data?.message ?? 'Failed to initialize consent')
  const consentId = data?.data?.data?.consentId
  if (!consentId) throw new Error('No consent ID returned')
  emit('update:consentId', consentId)
  const row = edocBank as EdocBank & { id?: number }
  const rawBankId = row.bankId ?? row.id
  const bankId = typeof rawBankId === 'number' ? rawBankId : parseInt(String(rawBankId), 10)
  if (!Number.isFinite(bankId) || bankId < 1) {
    throw new Error('Invalid EDOC bank id for selected bank')
  }
  await props.api.post(edocPath(edocApi.attachAccount()), {
    consentId,
    bankId,
    accountNumber: accountNumberDigits,
    accountType: 'Business',
    statementDuration: '12',
    monthType: 'Period',
    uploadType: 'Digital',
  })
  return consentId
}

async function generateStatement() {
  const edocBank = getEdocBank(props.account.bank)
  if (!props.account.bank) return emit('error', 'Please select a bank')
  const digits = getSanitizedAccountNumber(props.account.account_number)
  if (digits.length !== 10) return emit('error', 'Please provide a valid 10-digit account number')
  if (!edocBank) return emit('error', 'Selected bank does not support electronic statement retrieval')
  generatingStatement.value = true
  try {
    await consentAndAttach(edocBank, digits)
  } catch (err) {
    emit('error', errMsg(err))
  } finally {
    generatingStatement.value = false
  }
}

async function submitOtp() {
  if (!props.account.otp || !props.account.consent_id) return emit('error', 'Please enter OTP')
  submittingOtp.value = true
  try {
    const res = await props.api.post(edocPath(edocApi.getTransactions()), {
      consentId: props.account.consent_id,
      verificationCode: props.account.otp,
      bankStatementId: props.account.id,
    })
    const data = res?.data as { success?: boolean; data?: { statement?: BankStatementRecord }; message?: string }
    if (!data?.success) return emit('error', data?.message ?? 'Failed to retrieve transactions')
    if (data.data?.statement) emit('statement-retrieved', data.data.statement)
  } catch (err) {
    emit('error', errMsg(err))
  } finally {
    submittingOtp.value = false
  }
}

async function retrieveStatementDirect() {
  const edocBank = getEdocBank(props.account.bank)
  const digits = getSanitizedAccountNumber(props.account.account_number)
  if (!props.account.bank || digits.length !== 10) {
    return emit('error', 'Please select a bank and provide a valid 10-digit account number')
  }
  if (!edocBank) return emit('error', 'Selected bank does not support electronic statement retrieval')
  submittingOtp.value = true
  try {
    const consentId = await consentAndAttach(edocBank, digits)
    const res = await props.api.post(edocPath(edocApi.getTransactions()), {
      consentId,
      verificationCode: '',
      bankStatementId: props.account.id,
    })
    const data = res?.data as { success?: boolean; data?: { statement?: BankStatementRecord }; message?: string }
    if (!data?.success) return emit('error', data?.message ?? 'Failed to retrieve transactions')
    if (data.data?.statement) emit('statement-retrieved', data.data.statement)
  } catch (err) {
    emit('error', errMsg(err))
  } finally {
    submittingOtp.value = false
  }
}
</script>

<template>
  <div class="boi-emts-integration space-y-4">
    <div v-if="isBankEdocSupported(account.bank)">
      <!-- Success state -->
      <div v-if="account.statement_generated" class="rounded-lg border-2 border-primary bg-primary/5 p-4">
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
            <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
          </div>
          <h5 class="text-sm font-bold text-primary">Statement Generated Successfully and sent to Bank of Industry!</h5>
        </div>
        <p class="text-xs text-primary">Your bank statement has been automatically retrieved and saved.</p>
      </div>

      <template v-else>
        <!-- Banks WITH instructions (simplified flow) -->
        <template v-if="hasBankInstructions && !account.statement_generated">
          <div class="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 text-sm">
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <svg viewBox="0 0 24 24" class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="mb-2 text-sm font-bold text-blue-900">Electronic Bank Statement Required</h4>
                <p class="mb-3 text-xs text-blue-800">
                  {{ getEdocBank(account.bank)?.name || 'Your bank' }} supports automatic statement generation. Please follow the bank-specific instructions below before retrieving your statement.
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <div class="flex items-start gap-2">
              <div class="mt-0.5">
                <svg viewBox="0 0 24 24" class="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
              </div>
              <div>
                <p class="mb-2 font-semibold text-amber-900">Bank-Specific Instructions:</p>
                <ol class="list-inside list-decimal space-y-2 text-xs text-amber-800">
                  <li v-for="(instruction, idx) in getEdocBank(account.bank)?.bankInstructions" :key="idx">{{ instruction }}</li>
                </ol>
              </div>
            </div>
          </div>

          <div class="rounded-lg border-2 border-primary bg-white p-4">
            <div class="mb-3 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 6L9 17l-5-5"></path>
                </svg>
              </div>
              <h5 class="text-sm font-bold text-gray-900">Retrieve Statement</h5>
            </div>
            <p class="mb-3 !text-base text-gray-600">After completing the instructions above, click the button below to retrieve your bank statement.</p>
            <button
              type="button"
              class="bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium"
              :disabled="!canRetrieveStatement || disabled"
              @click="retrieveStatementDirect"
            >
              {{ submittingOtp ? 'Retrieving Statement…' : 'Retrieve Statement' }}
            </button>
          </div>
        </template>

        <!-- Banks WITHOUT instructions (standard OTP flow) -->
        <template v-else-if="!hasBankInstructions && !account.statement_generated">
          <div class="rounded-lg border-2 border-blue-300 bg-blue-50 p-4 text-sm">
            <div class="flex items-start gap-3">
              <div class="mt-0.5">
                <svg viewBox="0 0 24 24" class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="8"></line>
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="mb-2 text-sm font-bold text-blue-900">Electronic Bank Statement Required</h4>
                <p class="mb-3 text-xs text-blue-800">
                  {{ getEdocBank(account.bank)?.name || 'Your bank' }} supports automatic statement generation.
                  <strong>You must complete the OTP verification process below</strong> to retrieve your bank statement electronically.
                </p>
                <div class="rounded-md bg-blue-100 p-3">
                  <p class="mb-2 text-xs font-semibold text-blue-900">Follow these steps:</p>
                  <ol class="ml-4 list-decimal space-y-1.5 text-xs text-blue-800">
                    <li><strong>Step 1:</strong> Click &quot;Send OTP&quot; button below</li>
                    <li><strong>Step 2:</strong> Check your <strong>bank account&apos;s registered email</strong> for the verification code</li>
                    <li><strong>Step 3:</strong> Enter the code and click &quot;Verify OTP&quot;</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!account.showOtpInput" class="rounded-lg border-2 border-primary bg-white p-4">
            <div class="mb-3 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                1
              </div>
              <h5 class="text-sm font-bold text-gray-900">Request OTP</h5>
            </div>
            <p class="mb-3 !text-base text-gray-600">
              Click the button below to request an OTP. The verification code will be sent to the
              <strong>email address or phone number registered with your bank account</strong>.
            </p>
            <button
              type="button"
              class="bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium"
              :disabled="!canRequestOtp || disabled"
              @click="generateStatement"
            >
              {{ generatingStatement ? 'Sending OTP…' : 'Send OTP' }}
            </button>
          </div>

          <div v-else class="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div class="mb-3 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                2
              </div>
              <h5 class="text-sm font-bold text-gray-900">Enter OTP Code</h5>
            </div>
            <div class="mb-3 rounded-md bg-primary/10 p-2">
              <p class="text-xs text-primary">
                <strong>Check the email registered with your bank account</strong> for the verification code. It may take 1-2 minutes to arrive.
              </p>
            </div>

            <div class="grid grid-cols-1 items-start gap-3 md:grid-cols-3">
              <div class="md:col-span-2">
                <label class="mb-1 block text-xs font-medium text-gray-600" :for="`otp_${account.id}`">OTP Code</label>
                <input
                  :id="`otp_${account.id}`"
                  v-model="account.otp"
                  placeholder="Enter 6-digit OTP"
                  type="text"
                  maxlength="6"
                  class="w-full rounded border border-gray-200 bg-white px-3 py-2 text-lg tracking-widest focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-600">Action</label>
                <button
                  type="button"
                  class="w-full bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium"
                  :disabled="!canSubmitOtp || disabled"
                  @click="submitOtp"
                >
                  {{ submittingOtp ? 'Verifying…' : 'Verify OTP' }}
                </button>
              </div>
            </div>
          </div>
        </template>
      </template>
    </div>
    <div v-if="account.edoc_status === 'failed'" class="text-sm text-red-600">Statement retrieval failed. Please try again or upload manually.</div>
    <div v-if="account.edoc_status === 'processing'" class="text-sm text-amber-600">Processing…</div>
  </div>
</template>
