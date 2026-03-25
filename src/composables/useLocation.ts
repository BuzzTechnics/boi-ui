import { computed, ref } from 'vue'

export interface LocationState {
  id: number
  name: string
}

export interface LocationLga {
  id: number
  name: string
  state_id: number
}

export interface LocationCity {
  id: number
  name: string
  lga_id: number
}

const sharedStates = ref<LocationState[]>([])
const sharedLoading = ref(false)
const sharedError = ref<string | null>(null)
let statesPromise: Promise<LocationState[]> | null = null

const lgasCache = new Map<number, LocationLga[]>()
const lgasPromises = new Map<number, Promise<LocationLga[]>>()
const lgasLoading = ref(false)
const lgasError = ref<string | null>(null)
const allLgasCache = ref<LocationLga[]>([])
let allLgasPromise: Promise<LocationLga[]> | null = null

const citiesCache = new Map<number, LocationCity[]>()
const citiesPromises = new Map<number, Promise<LocationCity[]>>()
const citiesLoading = ref(false)
const citiesError = ref<string | null>(null)
const allCitiesCache = ref<LocationCity[]>([])
let allCitiesPromise: Promise<LocationCity[]> | null = null

function normalizeBaseUrl(raw: string | undefined): string {
  const normalized = String(raw ?? '').trim().replace(/\/$/, '')
  return normalized
}

function resolveBoiApiBase(apiBaseUrl?: string): string {
  // EDOC-like pattern: apps pass either `/api/boi-api` (server proxy) or a direct boi-api origin.
  const fromProp = normalizeBaseUrl(apiBaseUrl)
  if (fromProp) return fromProp

  // Optional: env override for generic consumers.
  const fromEnv = normalizeBaseUrl(import.meta.env.VITE_BOI_API_BASE as string | undefined)
  if (fromEnv) return fromEnv

  // Default: server proxy root.
  return '/api/boi-api'
}

async function apiGetJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`BOI API GET failed (${res.status}): ${body}`)
  }

  return (await res.json()) as T
}

export function useLocation(apiBaseUrl?: string) {
  const states = sharedStates
  const loading = sharedLoading
  const error = sharedError

  const lgas = ref<LocationLga[]>([])
  const cities = ref<LocationCity[]>([])

  const base = resolveBoiApiBase(apiBaseUrl)

  const loadStates = async () => {
    if (states.value.length > 0) return states.value
    if (statesPromise) return statesPromise

    loading.value = true
    error.value = null

    const promise = apiGetJson<LocationState[]>(`${base}/api/states`)
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          states.value = response
          return response
        }
        states.value = []
        return []
      })
      .catch((err) => {
        error.value = 'Failed to load states'
        console.error('Error loading states:', err)
        throw err
      })
      .finally(() => {
        loading.value = false
        statesPromise = null
      })

    statesPromise = promise
    return promise
  }

  const loadLgas = async (stateId: number) => {
    const cached = lgasCache.get(stateId)
    if (cached && cached.length > 0) {
      lgas.value = cached
      return cached
    }
    lgasCache.delete(stateId)

    if (lgasPromises.has(stateId)) {
      const p = lgasPromises.get(stateId)!
      const data = await p
      lgas.value = data
      return data
    }

    lgasLoading.value = true
    lgasError.value = null

    const promise = apiGetJson<LocationLga[]>(
      `${base}/api/lgas?state_id=${encodeURIComponent(String(stateId))}`,
    )
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          lgasCache.set(stateId, response)
          lgas.value = response
          return response
        }
        lgasCache.delete(stateId)
        lgas.value = []
        return []
      })
      .catch((err) => {
        lgasError.value = 'Failed to load LGAs'
        console.error('Error loading LGAs:', err)
        throw err
      })
      .finally(() => {
        lgasLoading.value = false
        lgasPromises.delete(stateId)
      })

    lgasPromises.set(stateId, promise)
    const data = await promise
    lgas.value = data
    return data
  }

  const loadAllLgas = async () => {
    if (allLgasCache.value.length > 0) {
      lgas.value = allLgasCache.value
      return allLgasCache.value
    }
    if (allLgasPromise) return allLgasPromise

    lgasLoading.value = true
    lgasError.value = null

    const promise = apiGetJson<LocationLga[]>(`${base}/api/all-lgas`)
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          allLgasCache.value = response
          lgas.value = response
          return response
        }
        allLgasCache.value = []
        lgas.value = []
        return []
      })
      .catch((err) => {
        lgasError.value = 'Failed to load LGAs'
        console.error('Error loading LGAs:', err)
        throw err
      })
      .finally(() => {
        lgasLoading.value = false
        allLgasPromise = null
      })

    allLgasPromise = promise
    return promise
  }

  const loadCities = async (lgaId: number) => {
    const cached = citiesCache.get(lgaId)
    if (cached && cached.length > 0) {
      cities.value = cached
      return cached
    }
    citiesCache.delete(lgaId)

    if (citiesPromises.has(lgaId)) {
      const p = citiesPromises.get(lgaId)!
      const data = await p
      cities.value = data
      return data
    }

    citiesLoading.value = true
    citiesError.value = null

    const promise = apiGetJson<LocationCity[]>(
      `${base}/api/cities?lga_id=${encodeURIComponent(String(lgaId))}`,
    )
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          citiesCache.set(lgaId, response)
          cities.value = response
          return response
        }
        citiesCache.delete(lgaId)
        cities.value = []
        return []
      })
      .catch((err) => {
        citiesError.value = 'Failed to load cities'
        console.error('Error loading cities:', err)
        throw err
      })
      .finally(() => {
        citiesLoading.value = false
        citiesPromises.delete(lgaId)
      })

    citiesPromises.set(lgaId, promise)
    const data = await promise
    cities.value = data
    return data
  }

  const loadAllCities = async () => {
    if (allCitiesCache.value.length > 0) {
      cities.value = allCitiesCache.value
      return allCitiesCache.value
    }
    if (allCitiesPromise) return allCitiesPromise

    citiesLoading.value = true
    citiesError.value = null

    const promise = apiGetJson<LocationCity[]>(`${base}/api/all-cities`)
      .then((response) => {
        if (Array.isArray(response) && response.length > 0) {
          allCitiesCache.value = response
          cities.value = response
          return response
        }
        allCitiesCache.value = []
        cities.value = []
        return []
      })
      .catch((err) => {
        citiesError.value = 'Failed to load cities'
        console.error('Error loading cities:', err)
        throw err
      })
      .finally(() => {
        citiesLoading.value = false
        allCitiesPromise = null
      })

    allCitiesPromise = promise
    return promise
  }

  const clearLgas = () => {
    lgas.value = []
  }

  const clearCities = () => {
    cities.value = []
  }

  const stateOptions = computed(() =>
    states.value.map((item) => ({
      value: item.id.toString(),
      label: item.name,
    })),
  )

  const lgaOptions = computed(() =>
    lgas.value.map((item) => ({
      value: item.id.toString(),
      label: item.name,
    })),
  )

  const cityOptions = computed(() =>
    cities.value.map((item) => ({
      value: item.id.toString(),
      label: item.name,
    })),
  )

  return {
    states,
    lgas,
    cities,
    loading,
    error,
    loadStates,
    loadLgas,
    loadAllLgas,
    loadCities,
    loadAllCities,
    clearLgas,
    clearCities,
    stateOptions,
    lgaOptions,
    cityOptions,
  }
}

