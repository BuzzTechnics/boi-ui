# EDOC / EMTS integration (boi-ui)

This package provides Vue components and composables for the EDOC (electronic document) bank statement flow: list supported banks, initialize consent, attach account, retrieve transactions (OTP or direct), and manual PDF upload.

## Types

- **EdocBank** — `bankId`, `name`, `bankCode`, `enabled`, `bankInstructions?`, etc.
- **BankStatementRecord** — `id`, `bank`, `account_number`, `email`, `consent_id`, `edoc_status` (`pending` | `processing` | `completed` | `failed`), `statement_generated`, `otp?`, `showOtpInput?`, etc.
- **BankOption** — `value`, `label`, `searchKeywords?` (for matching to EdocBank).
- **IndustrialSectorOption** — `value`, `label?`, `name?`, `id?`.

## useEdocBanks

- **Options**: `get(url)`, `getBanksUrl?`, `fallbackBanksUrl?`.
- **Returns**: `edocBanks` (ref), `banks` (ref), `loading`, `error`, `loadBanksForStatement()`, `invalidateCache()`.
- Normalizes API response (e.g. `{ success, data }` or raw array) into `EdocBank[]`. Caches result; use `invalidateCache()` to force refetch.

## EmtsIntegration

Single-account EDOC UI: bank select + account number + email (from parent), then either:

- **With bank instructions** — “Retrieve statement” (no OTP).
- **Without instructions** — “Send OTP” → enter OTP → “Verify OTP”.

**Props**: `account`, `edocBanks`, `bankOptions`, `api` (`.post`), `companyEmail?`, `industrialSector?`, `applicationId?`, `disabled?`.

**Events**: `update:consentId`, `statement-retrieved`, `error`.

Parent should set `account.consent_id` and `account.showOtpInput` on `update:consentId`, and update the record on `statement-retrieved`.

## BankStatementIntegration

Full section: tabs per account, load/save/add/remove via your API, EDOC via EmtsIntegration for supported banks, manual upload via slot.

**Props**: `applicationId?`, `api` (get/post/put/delete), `bankOptions`, `formData` (e.g. `email`, `industrial_sector_id`), `industrialSectorOptions?`, `baseUrl?`, `isFormDisabled?`, `maxAccounts?` (default 5).

**Slots**:

- `account-fields` — optional; default is bank select, account number, email.
- `file-upload` — **required** when bank is not EDOC-supported; receives `account` and `afterUpload(filePath)`. Call `afterUpload(s3Path)` after uploading the PDF.

Uses `bankStatementsApi.urls(applicationId, baseUrl)` for index/store/update/destroy/uploadToEdoc. Ensure your backend exposes these routes.

## API URL convention

- EDOC: `/api/edoc/banks`, `/api/edoc/consent/initialize`, etc. (see `edocApi`).
- Bank statements: `/api/loan-applications/:id/bank-statements` and `.../bank-statements/:sid/upload-to-edoc` (see `bankStatementsApi.urls`).

Use the same base URL as your app (e.g. relative) so `api.get/post` hit the correct host.
