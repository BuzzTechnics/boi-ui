/**
 * Bank statements API URL builders. Host app builds full URLs (e.g. baseURL + path).
 */
const defaultPrefix = '/api/loan-applications'

export function bankStatementsUrls(applicationId: string | number, baseUrl = '') {
  const prefix = baseUrl ? `${baseUrl.replace(/\/$/, '')}${defaultPrefix}` : defaultPrefix
  const id = String(applicationId)
  return {
    index: `${prefix}/${id}/bank-statements`,
    store: `${prefix}/${id}/bank-statements`,
    update: (statementId: string | number) => `${prefix}/${id}/bank-statements/${statementId}`,
    destroy: (statementId: string | number) => `${prefix}/${id}/bank-statements/${statementId}`,
    uploadToEdoc: (statementId: string | number) => `${prefix}/${id}/bank-statements/${statementId}/upload-to-edoc`,
  }
}

export const bankStatementsApi = {
  urls: bankStatementsUrls,
}
