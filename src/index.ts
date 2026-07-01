import type { App } from 'vue'
import './styles/theme.css'

export { default as BoiButton } from './components/BoiButton.vue'
export { default as Button } from './components/Button.vue'
export { default as EmtsIntegration } from './components/EmtsIntegration.vue'
export { default as BankStatementIntegration } from './components/BankStatementIntegration.vue'
export { default as BankStatementsPanel } from './components/BankStatementsPanel.vue'
export { default as BankSelect } from './components/BankSelect.vue'
export { default as FileInput } from './components/FileInput.vue'
export { default as EdocProcessingSpinner } from './components/EdocProcessingSpinner.vue'
export { default as ApplicationFormStepper } from './components/ApplicationFormStepper.vue'
export { default as LocationSelector } from './components/LocationSelector.vue'

export { default as CacRegistrationInput } from './components/CacRegistrationInput.vue'
export { default as TinInput } from './components/TinInput.vue'
export { default as MoneyInput } from './components/MoneyInput.vue'
export { default as BvnNinVerify } from './components/BvnNinVerify.vue'
export { default as PhoneInput } from './components/PhoneInput.vue'
export { default as GsiMandateIntegration } from './components/GsiMandateIntegration.vue'
export { default as ContactSupportWidget } from './components/ContactSupportWidget.vue'

// Shared form primitives (generic inputs/labels/buttons used across intervention forms)
export { default as TextInput } from './components/TextInput.vue'
export { default as PasswordInput } from './components/PasswordInput.vue'
export { default as TextareaInput } from './components/TextareaInput.vue'
export { default as SelectInput } from './components/SelectInput.vue'
export { default as InputLabel } from './components/InputLabel.vue'
export { default as InputError } from './components/InputError.vue'
export { default as AddItemButton } from './components/AddItemButton.vue'
export { default as RemoveItemButton } from './components/RemoveItemButton.vue'

export { useEdocBanks } from './composables/useEdocBanks'
export type { UseEdocBanksOptions } from './composables/useEdocBanks'
export { useAccountVerification } from './composables/useAccountVerification'
export type { VerifyBankAccountFn, VerificationState } from './composables/useAccountVerification'

export { useLocation } from './composables/useLocation'
export type { LocationState, LocationLga, LocationCity } from './composables/useLocation'

export { resolveBoiApiBaseUrl, ensureBoiApiSanctumCsrf } from './composables/useBoiApiBase'
export type { BoiApiBaseOptions } from './composables/useBoiApiBase'

export { useBankVerification } from './composables/useBankVerification'
export type { UseBankVerificationOptions } from './composables/useBankVerification'

export { edocApi } from './api/edoc'
export type { EdocApi } from './api/edoc'
export { bankStatementsApi, bankStatementsUrls } from './api/bankStatements'
export { filesApi, FILES_API_UPLOAD_PATH, withFilesIntegrationBase, boiFilesApiBase } from './api/files'

export { nipCodeForSelect } from './utils/nipBankCode'
export {
  incorporationDateError,
  tinLengthError,
  yearsOperatingError,
  normalizeBusinessWebsiteInput,
} from './utils/nigeriaCompanyFieldValidators'
export {
  validateFinancedItemName,
  validateFinancedItemQuantity,
  validateAssetName,
  validateAssetMarketValue,
  validateAssetForcedSaleValue,
  validateConsolidatedOutstandingBalance,
  validateConsolidatedAmountAccessed,
} from './utils/creditFacilityValidators'
export type { ConsolidatedFacilityForm } from './utils/creditFacilityValidators'
export { validateLiabilityOutstandingVsApproved } from './utils/relationshipLiabilityValidators'
export type { OutstandingLiabilityRow } from './utils/relationshipLiabilityValidators'

export type {
  EdocBank,
  BankStatementRecord,
  EdocConsentInitializePayload,
  EdocAttachAccountPayload,
  EdocGetTransactionsPayload,
  BankOption,
  IndustrialSectorOption,
  StateOption,
} from './types/edoc'

export function install(_app: App): void {
  // Components can be registered here for app.use() when consuming this package
}

export default {
  install,
}
