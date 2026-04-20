import { ref } from 'vue'
import type { EdocBank } from '../types/edoc'
import { edocApi } from '../api/edoc'

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
  if (Array.isArray(raw)) return raw as EdocBank[]
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
    return (raw as Record<string, EdocBank[]>).data
  }
  return []
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
          const list = Array.isArray(fallback?.data) ? (fallback.data as EdocBank[]) : []
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

  return {
    edocBanks,
    banks,
    loading: loadingBanks,
    error: errorBanks,
    loadBanksForStatement,
    invalidateCache: () => {
      edocBanks.value = banks.value = []
      banksPromise = null
      errorBanks.value = null
    },
  }
}
