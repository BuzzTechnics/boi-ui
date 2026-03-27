<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import type { BankOption, IndustrialSectorOption } from '../types/edoc'
import { ensureBoiApiSanctumCsrf } from '../composables/useBoiApiBase'
import { nipCodeForSelect } from '../utils/nipBankCode'
import BankStatementIntegration from './BankStatementIntegration.vue'

const props = withDefaults(
  defineProps<{
    applicationId?: number | string | null
    banks: Array<{ id?: number | string; name?: string; code?: string; short_name?: string }>
    email?: string
    industrialSectorId?: string | number
    sectorOptions?: IndustrialSectorOption[]
    isFormDisabled?: boolean
    blockAutoSave?: () => void
    unblockAutoSave?: () => void
    /** Same-origin host-app proxy base (e.g. `/api/boi-api`), never a direct boi-api origin. */
    boiApiBaseUrl: string
    api: {
      get: (url: string) => Promise<{ data?: unknown }>
      post: (url: string, data?: unknown, config?: unknown) => Promise<{ data?: unknown }>
      put: (url: string, data?: unknown) => Promise<{ data?: unknown }>
      delete: (url: string) => Promise<{ data?: unknown }>
    }
    verifyBankAccount: (
      accountNumber: string,
      bankCode: string,
    ) => Promise<{ account_name?: string; accountName?: string } | null>
  }>(),
  {
    applicationId: null,
    email: '',
    industrialSectorId: '',
    sectorOptions: () => [],
    isFormDisabled: false,
  },
)

const hasBoiProxyBase = computed(() => Boolean(props.boiApiBaseUrl))

const bankOptions = computed<BankOption[]>(() => {
  const banks = props.banks || []
  return banks.map((b) => {
    const fromCode = nipCodeForSelect(b.code)
    const value = fromCode || String(b.id ?? '')
    return {
      value,
      label: b.name || '',
      shortName: b.short_name || undefined,
      searchKeywords: b.short_name ? [b.short_name] : [],
    }
  })
})

const formData = computed(() => ({
  email: props.email ?? '',
  industrial_sector_id: props.industrialSectorId ?? '',
}))

async function primeSanctum() {
  await ensureBoiApiSanctumCsrf(props.boiApiBaseUrl)
}

onMounted(primeSanctum)
watch(() => props.boiApiBaseUrl, primeSanctum)

const verifyBankAccountAdapter = async (accountNumber: string, bankCode: string) => {
  const data = await props.verifyBankAccount(accountNumber, bankCode)
  if (!data) return null
  return {
    account_name: data.accountName ?? data.account_name,
    accountName: data.accountName ?? data.account_name,
  }
}
</script>

<template>
  <div
    id="bank-statements"
    class="bg-white rounded-xl px-4 py-4 md:p-6 shadow-md border border-gray-100"
  >
    <h3 class="font-bold text-xl text-black mb-6 pb-2 border-b-2 border-primary/20">
      <i class="fas fa-university text-primary mr-3"></i>
      Bank Statements
    </h3>
    <p class="text-gray-600 text-sm mb-4">
      Connect your bank account or upload a bank statement PDF for each account (max 5).
    </p>
    <BankStatementIntegration
      v-if="applicationId && hasBoiProxyBase"
      :application-id="String(applicationId)"
      :integration-base-url="boiApiBaseUrl"
      :api="api"
      :bank-options="bankOptions"
      :form-data="formData"
      :industrial-sector-options="sectorOptions"
      :is-form-disabled="isFormDisabled"
      :max-accounts="5"
      :verify-bank-account="verifyBankAccountAdapter"
      :block-auto-save="blockAutoSave"
      :unblock-auto-save="unblockAutoSave"
      :poll-edoc-status="true"
    />
    <p v-else-if="applicationId && !hasBoiProxyBase" class="text-amber-700 text-sm">
      Set <code class="text-xs bg-amber-50 px-1 rounded">BOI_API_URL</code> and matching
      <code class="text-xs bg-amber-50 px-1 rounded">BOI_API_KEY</code> on this app and boi-api so the
      <code class="text-xs bg-amber-50 px-1 rounded">/api/boi-api/…</code> proxy is available (browser
      calls stay on this origin; the server talks to boi-api).
    </p>
    <p v-else class="text-amber-700 text-sm">
      Save your application first to add bank statements.
    </p>
  </div>
</template>
