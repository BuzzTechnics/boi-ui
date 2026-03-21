# File upload (FileInput)

FileInput is a file picker that validates size/type, uploads to your API (e.g. boi-backend `/api/files/upload`), and shows a “View document” link using `/api/files/view`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | v-model: stored path after upload |
| `placeholder` | `string` | `'Choose file'` | Placeholder when no file |
| `accept` | `string` | `'*/*'` | HTML accept attribute |
| `disabled` | `boolean` | `false` | Disable input |
| `id` | `string` | — | Input id |
| `maxSize` | `number` | 10MB | Max size in bytes |
| `allowedTypes` | `string[]` | PDF, images, Office, etc. | MIME types allowed |
| `uploadToServer` | `boolean` | `true` | If true, call `post` with FormData; else emit file name only |
| `showRequirements` | `boolean` | `true` | Show “Max X MB. Allowed: …” text |
| `uploadContext` | `string` | — | Sent as `context` in FormData (e.g. `bank_statement` for backend 20MB limit) |
| `afterUpload` | `(path: string) => void` | — | Called after successful upload with the returned path |
| `uploadUrl` | `string` | `filesApi.upload()` | Upload endpoint URL (may be boi-api / proxy) |
| `viewApiBase` | `string` | — | When uploads use boi-api (or `/api/boi-api`), set the same base so “View document” hits `{base}/api/files/view?path=…` (presign on boi-api). |
| `post` | `(url, body, opts?) => Promise<{ data }>` | — | Required when `uploadToServer`: e.g. `(url, body, opts) => axios.post(url, body, opts)` |

## Events

- `update:modelValue` — path (or file name when not uploading)
- `validation-error` — validation message
- `validation-success` — success message
- `uploaded` — path after successful upload

## API

- **filesApi.upload()** — default `'/api/files/upload'`; prefix with **`VITE_FILES_API_BASE`** if needed.
- **filesApi.view(path)** — used when **`viewApiBase`** is unset: same-origin `/api/files/view?path=...` (portal S3).
- With **`viewApiBase`** (e.g. Glow’s `integrationBaseUrl` = `…/api/boi-api`), the view URL is **`{viewApiBase}/api/files/view?path=…`**, which the proxy forwards to **boi-api** so presigning matches where EDOC files were stored.

See `boi-backend` `docs/files.md` and `doc/edoc-s3.md`.

## Backend

Implement file routes on **boi-api** (and optionally the same on the portal). When using **`BoiBackend::proxyRoute()`**, bank-statement flows should pass **`viewApiBase`** = integration base so view requests are proxied to boi-api.
