/**
 * Centralized boi-api file routes (`FileController`). Shell apps (Glow, portal) forward them through the
 * same-origin `/api/boi-api/*` proxy — consumers can use `FileInput` with only `:post` (axios), no URL props.
 *
 * - Default base: `/api/boi-api` (relative).
 * - Override: `VITE_BOI_FILES_API_BASE` (e.g. `https://api.example.com` for direct cross-origin).
 * - Shell-only `FileController` / local disk: set `VITE_BOI_FILES_API_BASE=` (empty) → `/api/files/…` on the shell.
 *
 * When building URLs with a separate `integrationBaseUrl`, use `FILES_API_UPLOAD_PATH` + `withFilesIntegrationBase`,
 * not `filesApi.upload()`, so the base is not applied twice.
 */
export const FILES_API_UPLOAD_PATH = '/api/files/upload' as const

const VIEW_SUFFIX = '/api/files/view' as const

/** Base for boi-api file upload/view (no trailing slash). Empty = shell app root (legacy local disk). */
export function boiFilesApiBase(): string {
  const raw = import.meta.env.VITE_BOI_FILES_API_BASE as string | undefined
  if (raw === '') {
    return ''
  }
  if (raw != null && String(raw).trim() !== '') {
    return String(raw).replace(/\/$/, '')
  }
  return '/api/boi-api'
}

export function withFilesIntegrationBase(integrationBaseUrl: string, path: string): string {
  const b = integrationBaseUrl.replace(/\/$/, '')
  if (!b) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${b}${p}`
}

export const filesApi = {
  /** Default: boi-api via `/api/boi-api` proxy. */
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
