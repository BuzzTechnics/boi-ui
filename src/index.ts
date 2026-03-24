import type { App } from 'vue'
import './styles/theme.css'

export { default as BoiButton } from './components/BoiButton.vue'
export { default as Button } from './components/Button.vue'
export { default as EmtsIntegration } from './components/EmtsIntegration.vue'
export { default as BankStatementIntegration } from './components/BankStatementIntegration.vue'
export { default as BankSelect } from './components/BankSelect.vue'
export { default as FileInput } from './components/FileInput.vue'
export { default as ApplicationFormStepper } from './components/ApplicationFormStepper.vue'

export { useEdocBanks } from './composables/useEdocBanks'
export type { UseEdocBanksOptions } from './composables/useEdocBanks'
export { useAccountVerification } from './composables/useAccountVerification'
export type { VerifyBankAccountFn, VerificationState } from './composables/useAccountVerification'

export { edocApi } from './api/edoc'
export type { EdocApi } from './api/edoc'
export { bankStatementsApi, bankStatementsUrls } from './api/bankStatements'
export { filesApi } from './api/files'

export type {
  EdocBank,
  BankStatementRecord,
  EdocConsentInitializePayload,
  EdocAttachAccountPayload,
  EdocGetTransactionsPayload,
  BankOption,
  IndustrialSectorOption,
} from './types/edoc'

export function install(_app: App): void {
  // Components can be registered here for app.use() when consuming this package
}

export default {
  install,
}
