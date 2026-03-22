# boi-ui

Vue 3 + TypeScript UI package for BOI (EDOC/EMTS bank statement components and composables).

**Full docs:** [docs/](docs/) — [README](docs/README.md), [EDOC/EMTS](docs/edoc.md), [File upload](docs/files.md)

## Installation

```bash
npm install boi-ui vue
# or
pnpm add boi-ui vue
# or
yarn add boi-ui vue
```

## Usage

```vue
<script setup>
import { BoiButton } from 'boi-ui'
</script>

<template>
  <BoiButton label="Click me" variant="primary" />
</template>
```

Or register globally:

```ts
import { createApp } from 'vue'
import BoiUi from 'boi-ui'
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

## Releasing (`boi-ui`)

The published artifact is the **`dist/`** folder (see `"files"` in `package.json`). `prepublishOnly` runs `npm run build` before publish.

1. Bump **`version`** in `package.json` (semver).
2. Commit, tag, and push:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. Publish to npm (scoped name requires `--access public` if you rename to `@scope/boi-ui`):

   ```bash
   npm publish
   ```

4. Consumers: `npm install boi-ui` / `pnpm add boi-ui` (peer: `vue@^3.4`).
