export type BoiApiBaseOptions = {
  /**
   * Same-origin host-app proxy to boi-api, e.g. `/api/boi-api` (server sets BOI_API_URL + BOI_API_KEY).
   * Browser must never call boi-api directly; only this path is used for API base.
   */
  boiProxy?: string | null
  /** @deprecated Ignored — do not expose boi-api origin to the browser. */
  boiApiUrl?: string | null
  /** @deprecated Ignored — do not expose boi-api origin to the browser. */
  viteBoiApiUrl?: string | null
}

/** Resolves only the host-app proxy base (e.g. `/api/boi-api`). Never returns a direct boi-api origin. */
export function resolveBoiApiBaseUrl(opts: BoiApiBaseOptions): string {
  return String(opts.boiProxy ?? '').replace(/\/$/, '')
}

/** Cross-origin: prime CSRF on boi-api (legacy). Same-origin proxy paths skip. */
export async function ensureBoiApiSanctumCsrf(boiApiBaseUrl: string): Promise<void> {
  const base = boiApiBaseUrl
  if (!base || typeof window === 'undefined') return
  let resolved: string
  try {
    resolved = base.startsWith('http') ? base : new URL(base, window.location.origin).href
  } catch {
    return
  }
  let apiOrigin: string
  try {
    apiOrigin = new URL(resolved).origin
  } catch {
    return
  }
  if (apiOrigin === window.location.origin) return
  try {
    await fetch(`${resolved.replace(/\/$/, '')}/sanctum/csrf-cookie`, {
      credentials: 'include',
      method: 'GET',
    })
  } catch {
    /* non-fatal */
  }
}
