/**
 * File upload / view URLs on the consuming app (e.g. Glow). Presigning uses that app’s S3 config
 * (`/api/files/view`, `Storage::disk('s3')` presign in Laravel, `boi_edoc` for `edoc/statements/…`).
 *
 * Uploads may still target `integrationBaseUrl` (boi-api) via `uploadUrl` on FileInput; view always
 * uses these paths so “View document” hits the SPA host, not boi-api.
 *
 * Optional: `VITE_FILES_API_BASE` when the static SPA origin differs from the Laravel app
 * (e.g. VITE_FILES_API_BASE=https://glow.test).
 */
const base = (import.meta.env.VITE_FILES_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

export const filesApi = {
  upload: () => `${base}/api/files/upload`,
  view: (path: string) => `${base}/api/files/view?path=${encodeURIComponent(path)}`,
} as const
