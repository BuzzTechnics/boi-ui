export type BoiApiBaseOptions = {
  boiProxy?: string | null
  boiApiUrl?: string | null
  /** e.g. `import.meta.env.VITE_BOI_API_URL` */
  viteBoiApiUrl?: string | null
}

/** Prefer `/api/boi-api/*` proxy; else direct boi-api + Vite URL. */
export function resolveBoiApiBaseUrl(opts: BoiApiBaseOptions): string {
  const proxy = String(opts.boiProxy ?? '').replace(/\/$/, '')
  if (proxy) return proxy
  const fromServer = String(opts.boiApiUrl ?? '').replace(/\/$/, '')
  const fromVite = String(opts.viteBoiApiUrl ?? '').replace(/\/$/, '')
  return fromServer || fromVite
}

/** Cross-origin API: prime CSRF cookie on boi-api (required before POST/PUT/DELETE). */
export async function ensureBoiApiSanctumCsrf(boiApiBaseUrl: string): Promise<void> {
  const base = boiApiBaseUrl
  if (!base || typeof window === 'undefined') return
  let apiOrigin: string
  try {
    const absolute = base.startsWith('http') ? base : `${window.location.protocol}//${base}`
    apiOrigin = new URL(absolute).origin
  } catch {
    return
  }
  if (apiOrigin === window.location.origin) return
  try {
    await fetch(`${base.replace(/\/$/, '')}/sanctum/csrf-cookie`, {
      credentials: 'include',
      method: 'GET',
    })
  } catch {
    /* non-fatal */
  }
}
