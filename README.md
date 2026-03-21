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
