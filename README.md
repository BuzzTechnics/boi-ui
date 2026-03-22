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

The published artifact is the **`dist/`** folder (see `"files"` in `package.json`). `prepublishOnly` runs `npm run build` before publish.

**Before the first publish:** the **`buzztech`** scope must exist on npm. Create a free org: [npmjs.com/org/create](https://www.npmjs.com/org/create) → organization name **`buzztech`** → add your npm user as owner. Scoped public packages still need `publishConfig.access: "public"` (already set); that does **not** replace creating the scope.

1. Bump **`version`** in `package.json` (semver).
2. Commit, tag, and push:

   ```bash
   git tag v0.2.1
   git push origin v0.2.1
   ```

3. Publish to npm:

   ```bash
   npm publish
   ```

4. Consumers: `npm install @buzztech/boi-ui` / `pnpm add @buzztech/boi-ui` (peer: `vue@^3.4`).

### `404 Scope not found` when running `npm publish`

npm returns this when **`@buzztech` is not a valid scope** for your account (no org/user with that name on the registry). Fix: create the **`buzztech`** org on npm (link above), **or** rename the package in `package.json` to a scope you already own (e.g. `@your-npm-username/boi-ui`).
