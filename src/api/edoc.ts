/**
 * EDOC API endpoint paths. Host app builds full URLs (e.g. baseURL + path).
 */
export const edocApi = {
  getBanks: () => '/api/edoc/banks',
  initializeConsent: () => '/api/edoc/consent/initialize',
  attachAccount: () => '/api/edoc/consent/attach-account',
  getTransactions: () => '/api/edoc/consent/transactions',
  manualUpload: () => '/api/edoc/manual-upload',
} as const

export type EdocApi = typeof edocApi
