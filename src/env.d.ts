/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'intl-tel-input' {
  interface IntlTelInputInstance {
    getSelectedCountryData(): { dialCode: string }
    /** E.164 (e.g. +2348012345678) once utils.js has loaded; '' when unparseable. */
    getNumber(): string
    /** Render the flag + national portion from an E.164/international string. */
    setNumber(number: string): void
    destroy(): void
  }
  const intlTelInput: (
    input: HTMLInputElement,
    options?: Record<string, unknown>,
  ) => IntlTelInputInstance
  export default intlTelInput
}
