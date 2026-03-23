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
})
