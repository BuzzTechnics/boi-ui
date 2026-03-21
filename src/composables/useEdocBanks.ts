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
  const edocBanksCache = ref<EdocBank[]>([])
  const banksCache = ref<EdocBank[]>([])
  const loadingBanks = ref(false)
  const errorBanks = ref<string | null>(null)
  let banksPromise: Promise<EdocBank[]> | null = null

  const loadBanksForStatement = async (): Promise<EdocBank[]> => {
    if (edocBanksCache.value.length > 0) return edocBanksCache.value
    if (banksPromise) return banksPromise

    loadingBanks.value = true
    errorBanks.value = null
    banksPromise = (async () => {
      try {
        const res = await get(resolveUrl(getBanksUrl, edocApi.getBanks()))
        const list = toBanksList(res?.data)
        if (list.length) {
          edocBanksCache.value = banksCache.value = list
          return list
        }
      } catch {}
      const fallbackUrl =
        fallbackBanksUrl != null ? resolveUrl(fallbackBanksUrl, '') : ''
      if (fallbackUrl) {
        try {
          const fallback = await get(fallbackUrl)
          const list = Array.isArray(fallback?.data) ? (fallback.data as EdocBank[]) : []
          edocBanksCache.value = banksCache.value = list
          return list
        } catch (err: unknown) {
          errorBanks.value = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to load banks'
          throw err
        }
      }
      return []
    })().finally(() => {
      loadingBanks.value = false
      banksPromise = null
    })
    return banksPromise
  }

  return {
    edocBanks: edocBanksCache,
    banks: banksCache,
    loading: loadingBanks,
    error: errorBanks,
    loadBanksForStatement,
    invalidateCache: () => {
      edocBanksCache.value = banksCache.value = []
      banksPromise = null
      errorBanks.value = null
    },
  }
}
