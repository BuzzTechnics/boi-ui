/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'intl-tel-input' {
  interface IntlTelInputInstance {
    getSelectedCountryData(): { dialCode: string }
  }
  const intlTelInput: (
    input: HTMLInputElement,
    options?: Record<string, unknown>,
  ) => IntlTelInputInstance
  export default intlTelInput
}
