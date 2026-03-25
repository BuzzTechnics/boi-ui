/**
 * File upload / view on the host app (`buzztech/boi-backend` registers `/api/files/upload` and `/api/files/view`
 * using that app’s `filesystems.disks.s3`).
 *
 * - Default: same origin only — `/api/files/*` (no base prefix).
 * - Centralized boi-api only when needed (e.g. some flows): set `VITE_BOI_FILES_API_BASE` to `/api/boi-api`
 *   or `https://api.example.com` (must match how the SPA reaches that API).
 *
 * Bank statements / EDOC still pass `integrationBaseUrl` into `BankStatementIntegration` and use
 * `FILES_API_UPLOAD_PATH` + `withFilesIntegrationBase` so uploads hit boi-api while generic `FileInput` uses the host.
 */
export const FILES_API_UPLOAD_PATH = '/api/files/upload' as const

const VIEW_SUFFIX = '/api/files/view' as const

/** Base URL for file routes (no trailing slash). Empty = host app `/api/files/*`. */
export function boiFilesApiBase(): string {
  const raw = import.meta.env.VITE_BOI_FILES_API_BASE as string | undefined
  if (raw === '') {
    return ''
  }
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return ''
}

export function withFilesIntegrationBase(integrationBaseUrl: string, path: string): string {
  const b = integrationBaseUrl.replace(/\/$/, '')
  if (!b) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export const filesApi = {
  upload: () => {
    const b = boiFilesApiBase()
    return b ? `${b}${FILES_API_UPLOAD_PATH}` : FILES_API_UPLOAD_PATH
  },
  view: (path: string) => {
    const b = boiFilesApiBase()
    const q = `?path=${encodeURIComponent(path)}`
    return b ? `${b}${VIEW_SUFFIX}${q}` : `${VIEW_SUFFIX}${q}`
  },
} as const
