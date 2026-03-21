import { describe, it, expect } from 'vitest'
import { edocApi } from '../../src/api/edoc'

describe('edocApi', () => {
  it('exposes getBanks path', () => {
    expect(edocApi.getBanks()).toBe('/api/edoc/banks')
  })

  it('exposes consent and transactions paths', () => {
    expect(edocApi.initializeConsent()).toBe('/api/edoc/consent/initialize')
    expect(edocApi.attachAccount()).toBe('/api/edoc/consent/attach-account')
    expect(edocApi.getTransactions()).toBe('/api/edoc/consent/transactions')
    expect(edocApi.manualUpload()).toBe('/api/edoc/manual-upload')
  })
})
