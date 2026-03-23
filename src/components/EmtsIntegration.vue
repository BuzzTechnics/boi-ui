<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BankStatementRecord, EdocBank, BankOption } from '../types/edoc'
import { edocApi } from '../api/edoc'
import { edocRowMatchesLocalBank } from '../utils/bankCodesEquivalent'
import BoiButton from './BoiButton.vue'

/** Shared classes: compact black actions for OTP flow */
const otpActionClass =
  'inline-flex items-center justify-center rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

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

function bankNames(bankCode: string): string[] {
  const b = props.bankOptions.find((o) => String(o.value) === String(bankCode))
  return [b?.label ?? '', ...(b?.searchKeywords ?? [])].filter(Boolean)
}

function matchBank(bankCode: string, enabledOnly = false): EdocBank | undefined {
  if (!bankCode || !props.edocBanks.length) return undefined
  const names = bankNames(bankCode)
  return props.edocBanks.find((b) =>
    edocRowMatchesLocalBank(bankCode, b as unknown as Record<string, unknown>, names, enabledOnly)
  )
}

const getEdocBank = (code: string) => matchBank(code, false)
const isBankEdocSupported = (code: string) => !!matchBank(code, true)
const hasBankInstructions = computed(() => !!(getEdocBank(props.account.bank)?.bankInstructions?.length))
const canRequestOtp = computed(() => {
  const a = props.account
  return !!a.bank && a.account_number?.length === 10 && !generatingStatement.value && !submittingOtp.value
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

async function consentAndAttach(edocBank: EdocBank) {
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
    accountNumber: props.account.account_number,
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
  if (props.account.account_number?.length !== 10) return emit('error', 'Please provide a valid 10-digit account number')
  if (!edocBank) return emit('error', 'Selected bank does not support electronic statement retrieval')
  generatingStatement.value = true
  try {
    await consentAndAttach(edocBank)
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
  if (!props.account.bank || props.account.account_number?.length !== 10) {
    return emit('error', 'Please select a bank and provide a valid 10-digit account number')
  }
  if (!edocBank) return emit('error', 'Selected bank does not support electronic statement retrieval')
  submittingOtp.value = true
  try {
    const consentId = await consentAndAttach(edocBank)
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
      <template v-if="hasBankInstructions && !account.statement_generated">
        <div class="boi-emts-instructions rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p class="mb-2 font-semibold text-amber-900">Bank-specific instructions</p>
          <ol class="list-inside list-decimal space-y-1 text-amber-800">
            <li v-for="(instruction, idx) in getEdocBank(account.bank)?.bankInstructions" :key="idx">{{ instruction }}</li>
          </ol>
        </div>
        <BoiButton
          :label="submittingOtp ? 'Retrieving…' : 'Retrieve statement'"
          variant="primary"
          :disabled="!canRequestOtp || disabled"
          @click="retrieveStatementDirect"
        />
      </template>
      <template v-else-if="!hasBankInstructions && !account.statement_generated">
        <button
          v-if="!account.showOtpInput"
          type="button"
          :class="otpActionClass"
          :disabled="!canRequestOtp || disabled"
          @click="generateStatement"
        >
          {{ generatingStatement ? 'Sending OTP…' : 'Send OTP' }}
        </button>
        <div v-else class="boi-emts-otp space-y-3 rounded-lg border-2 border-primary bg-primary/5 p-4">
          <p class="text-sm font-medium text-gray-700">Enter the OTP sent to your bank-registered email.</p>
          <div class="flex flex-wrap items-end gap-3">
            <div class="min-w-[140px]">
              <label class="mb-1 block text-xs font-medium text-gray-600">OTP code</label>
              <input v-model="account.otp" type="text" maxlength="6" placeholder="6-digit OTP" class="w-full rounded border border-gray-300 px-3 py-2 text-lg tracking-widest" />
            </div>
            <button
              type="button"
              :class="otpActionClass"
              :disabled="!canSubmitOtp || disabled"
              @click="submitOtp"
            >
              Verify OTP
            </button>
          </div>
        </div>
      </template>
    </div>
    <div v-if="account.edoc_status === 'failed'" class="text-sm text-red-600">Statement retrieval failed. Please try again or upload manually.</div>
    <div v-if="account.edoc_status === 'processing'" class="text-sm text-amber-600">Processing…</div>
  </div>
</template>
