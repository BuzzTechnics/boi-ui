# boi-ui

Vue 3 + TypeScript UI package for BOI, including EDOC (electronic document) bank statement integration components and composables.

## Installation

```bash
npm install boi-ui vue
# or
pnpm add boi-ui vue
# or
yarn add boi-ui vue
```

## Usage

### Components

**BoiButton** — Simple button with `primary` / `secondary` variants.

```vue
<script setup>
import { BoiButton } from 'boi-ui'
</script>
<template>
  <BoiButton label="Submit" variant="primary" />
</template>
```

**EmtsIntegration** — Single-account EDOC flow: OTP or direct statement retrieval.

```vue
<script setup>
import { EmtsIntegration } from 'boi-ui'
</script>
<template>
  <EmtsIntegration
    :account="account"
    :edoc-banks="edocBanks"
    :bank-options="bankOptions"
    :api="{ post: axios.post }"
    company-email="user@example.com"
    @update:consent-id="account.consent_id = $event"
    @statement-retrieved="onStatement($event)"
    @error="onError($event)"
  />
</template>
```

**BankStatementIntegration** — Full section: multiple accounts, EDOC + manual upload slot, polling.

```vue
<script setup>
import { BankStatementIntegration } from 'boi-ui'
</script>
<template>
  <BankStatementIntegration
    application-id="123"
    :api="api"
    :bank-options="bankOptions"
    :form-data="formData"
    :industrial-sector-options="sectorOptions"
  >
    <template #file-upload="{ account, afterUpload }">
      <FileInput v-model="account.bank_statement" :post="api.post" upload-context="bank_statement" :after-upload="afterUpload" accept=".pdf" />
    </template>
  </BankStatementIntegration>
</template>
```

**FileInput** — File picker with upload-to-server, validation, and “view document” link. See [files.md](files.md).

```vue
<script setup>
import { FileInput } from 'boi-ui'
</script>
<template>
  <FileInput
    v-model="path"
    :post="(url, body, opts) => axios.post(url, body, opts)"
    placeholder="Choose PDF"
    accept=".pdf"
    :max-size="20 * 1024 * 1024"
    :allowed-types="['application/pdf']"
    upload-context="bank_statement"
    :after-upload="onUploaded"
  />
</template>
```

### Composable

**useEdocBanks** — Load and cache EDOC-supported banks.

```ts
import { useEdocBanks } from 'boi-ui'

const { edocBanks, loading, error, loadBanksForStatement, invalidateCache } = useEdocBanks({
  get: (url) => axios.get(url).then(r => ({ data: r.data })),
  getBanksUrl: '/api/edoc/banks',  // optional
  fallbackBanksUrl: '/api/banks',  // optional
})

await loadBanksForStatement()
// edocBanks.value is now populated
```

### API helpers

```ts
import { edocApi, bankStatementsApi } from 'boi-ui'

edocApi.getBanks()           // '/api/edoc/banks'
edocApi.initializeConsent()   // '/api/edoc/consent/initialize'
edocApi.attachAccount()      // '/api/edoc/consent/attach-account'
edocApi.getTransactions()     // '/api/edoc/consent/transactions'
edocApi.manualUpload()        // '/api/edoc/manual-upload'

const urls = bankStatementsApi.urls('123', 'https://api.example.com')
urls.index       // .../api/loan-applications/123/bank-statements
urls.store       // same
urls.update(id)  // .../bank-statements/{id}
urls.destroy(id)
urls.uploadToEdoc(id)

filesApi.upload()              // '/api/files/upload'
filesApi.view(path)            // '/api/files/view?path=...'
```

### Types

See [edoc.md](edoc.md). Exported types: `EdocBank`, `BankStatementRecord`, `BankOption`, `IndustrialSectorOption`, and payload types for consent/attach/transactions.

## Testing

```bash
pnpm test
# or watch
pnpm test:watch
```

Tests use Vitest and `@vue/test-utils`.
