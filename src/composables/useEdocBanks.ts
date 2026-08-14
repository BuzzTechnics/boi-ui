import { ref } from 'vue'
import type { EdocBank } from '../types/edoc'
import { edocApi } from '../api/edoc'
import { bankCodesEquivalent } from '../utils/bankCodesEquivalent'

export interface UseEdocBanksOptions {
  get: (url: string) => Promise<{ data?: unknown }>
  /** Path or absolute URL; or a getter so it stays in sync with props (e.g. integration base URL). */
  getBanksUrl?: string | (() => string)
  fallbackBanksUrl?: string | (() => string)
}

function toBanksList(data: unknown): EdocBank[] {
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  const raw = (d.success ? d.data : d.data ?? d) as unknown
  if (Array.isArray(raw)) return normalizeBanks(raw)
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
    return normalizeBanks((raw as Record<string, unknown[]>).data)
  }
  return []
}

/**
 * The eDoc master list is camelCase while product fallback endpoints tend to be
 * snake_case; fold both spellings of the bank-registered-email flag onto the
 * typed field so consumers only ever look in one place.
 */
function normalizeBanks(rows: unknown[]): EdocBank[] {
  return rows.map((row) => {
    if (!row || typeof row !== 'object') return row as EdocBank
    const r = row as Record<string, unknown>
    const flag = r.requiresBankRegisteredEmail ?? r.requires_bank_registered_email
    return (flag === undefined ? row : { ...r, requiresBankRegisteredEmail: flag === true }) as EdocBank
  })
}

function resolveUrl(u: string | (() => string) | undefined, fallback: string): string {
  if (u === undefined) return fallback
  return typeof u === 'function' ? u() : u
}

export function useEdocBanks(options: UseEdocBanksOptions) {
  const { get, getBanksUrl, fallbackBanksUrl } = options
  // Reactive refs expose the latest fetched list to consumers but the list is NOT cached
  // across calls — each invocation of loadBanksForStatement() hits EDOC live so bank
  // additions/removals on EDOC's side are visible immediately.
  const edocBanks = ref<EdocBank[]>([])
  const banks = ref<EdocBank[]>([])
  const loadingBanks = ref(false)
  const errorBanks = ref<string | null>(null)
  // Only in-flight dedupe (so a single render with multiple BankSelect components
  // doesn't fan out N parallel requests). Cleared as soon as the fetch resolves.
  let banksPromise: Promise<EdocBank[]> | null = null

  const loadBanksForStatement = async (): Promise<EdocBank[]> => {
    if (banksPromise) return banksPromise

    loadingBanks.value = true
    errorBanks.value = null
    banksPromise = (async () => {
      try {
        const res = await get(resolveUrl(getBanksUrl, edocApi.getBanks()))
        const list = toBanksList(res?.data)
        if (list.length) {
          edocBanks.value = banks.value = list
          return list
        }
      } catch {}
      const fallbackUrl =
        fallbackBanksUrl != null ? resolveUrl(fallbackBanksUrl, '') : ''
      if (fallbackUrl) {
        try {
          const fallback = await get(fallbackUrl)
          const list = Array.isArray(fallback?.data) ? normalizeBanks(fallback.data as unknown[]) : []
          edocBanks.value = banks.value = list
          return list
        } catch (err: unknown) {
          errorBanks.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to load banks'
          throw err
        }
      }
      edocBanks.value = banks.value = []
      return []
    })().finally(() => {
      loadingBanks.value = false
      banksPromise = null
    })
    return banksPromise
  }

  /**
   * Whether the bank matches forwarded statements by the email the customer
   * registered with the BANK (Fidelity is the first). When true, the consent
   * must carry that address — never the product's own account email, which
   * silently strands the eDoc request.
   */
  const bankRequiresRegisteredEmail = (bankCode: string): boolean => {
    const code = (bankCode ?? '').trim()
    if (code === '') return false

    return banks.value.some(
      (bank) =>
        bank.requiresBankRegisteredEmail === true &&
        (bankCodesEquivalent(bank.bankCode ?? '', code) || bankCodesEquivalent(bank.code ?? '', code))
    )
  }

  return {
    edocBanks,
    banks,
    loading: loadingBanks,
    error: errorBanks,
    loadBanksForStatement,
    bankRequiresRegisteredEmail,
    invalidateCache: () => {
      edocBanks.value = banks.value = []
      banksPromise = null
      errorBanks.value = null
    },
  }
}
