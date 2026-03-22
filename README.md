# @buzztech/boi-ui

Vue 3 + TypeScript UI package for BOI (EDOC/EMTS bank statement components and composables).

**Full docs:** [docs/](docs/) — [README](docs/README.md), [EDOC/EMTS](docs/edoc.md), [File upload](docs/files.md)

## Installation

```bash
npm install @buzztech/boi-ui vue
# or
pnpm add @buzztech/boi-ui vue
# or
yarn add @buzztech/boi-ui vue
```

## Usage

```vue
<script setup>
import { BoiButton } from '@buzztech/boi-ui'
</script>

<template>
  <BoiButton label="Click me" variant="primary" />
</template>
```

Or register globally:

```ts
import { createApp } from 'vue'
import BoiUi from '@buzztech/boi-ui'
import App from './App.vue'

const app = createApp(App)
app.use(BoiUi)
app.mount('#app')
```

## Development

```bash
pnpm install
pnpm build
pnpm type-check
pnpm test
```

## Releasing (`@buzztech/boi-ui`)

The published artifact is the **`dist/`** folder (see `"files"` in `package.json`). `prepublishOnly` runs `npm run build` before publish. **`publishConfig.access`** is **`public`** so the scoped package installs without an npm org login for private-only scopes.

1. Bump **`version`** in `package.json` (semver).
2. Commit, tag, and push:

   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

3. Publish to npm:

   ```bash
   npm publish
   ```

4. Consumers: `npm install @buzztech/boi-ui` / `pnpm add @buzztech/boi-ui` (peer: `vue@^3.4`).
