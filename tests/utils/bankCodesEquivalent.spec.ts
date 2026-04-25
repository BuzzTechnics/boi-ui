import { describe, expect, it } from 'vitest'
import { bankCodesEquivalent, edocRowMatchesLocalBank } from '../../src/utils/bankCodesEquivalent'

describe('bankCodesEquivalent', () => {
  it('matches 3-digit NIP to EDOC-style short code', () => {
    expect(bankCodesEquivalent('057', '57')).toBe(true)
    expect(bankCodesEquivalent('058', '058')).toBe(true)
  })

  it('is case-insensitive for alphanumeric', () => {
    expect(bankCodesEquivalent('AbC', 'abc')).toBe(true)
  })
})

describe('edocRowMatchesLocalBank', () => {
  it('matches via alternate API keys', () => {
    const row = { bankId: 1, name: 'Test', BankCode: '57', enabled: true }
    expect(edocRowMatchesLocalBank('057', row, ['Test'], true)).toBe(true)
  })

  it('respects enabled flag when enabledOnly', () => {
    const row = { bankId: 1, name: 'Test', bankCode: '057', enabled: false }
    expect(edocRowMatchesLocalBank('057', row, [], true)).toBe(false)
  })

  it('matches a sub-brand to its EDOC parent via edocBankId', () => {
    // EDOC master returns Wema (bankId: 1, code: 035). Local bank is
    // "ALAT by WEMA" (code 035A) — code/name comparison would not match,
    // but both share edoc_bank_id=1 in the local DB.
    const row = { bankId: 1, name: 'Wema Bank', bankCode: '035', enabled: true }
    expect(edocRowMatchesLocalBank('035A', row, ['ALAT by WEMA'], true, 1)).toBe(true)
  })

  it('does not cross-match unrelated banks even with same code shape when edocBankId differs', () => {
    const row = { bankId: 2, name: 'Providus', bankCode: '101', enabled: true }
    // Local edocBankId=1 (e.g. Wema) must not match a row with bankId=2.
    expect(edocRowMatchesLocalBank('035A', row, ['ALAT by WEMA'], true, 1)).toBe(false)
  })
})
