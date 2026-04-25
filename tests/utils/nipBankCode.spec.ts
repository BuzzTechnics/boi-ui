import { describe, expect, it } from 'vitest'
import { nipCodeForSelect } from '../../src/utils/nipBankCode'

describe('nipCodeForSelect', () => {
  it('pads short purely-numeric codes to 3 digits', () => {
    expect(nipCodeForSelect('57')).toBe('057')
    expect(nipCodeForSelect('11')).toBe('011')
  })

  it('leaves longer purely-numeric codes alone', () => {
    expect(nipCodeForSelect('50211')).toBe('50211')
    expect(nipCodeForSelect('035')).toBe('035')
  })

  it('preserves codes that contain letters so they do not collide', () => {
    // "035A" (ALAT by WEMA) used to strip to "035", colliding with Wema Bank's "035"
    // and producing duplicate Vue keys in the bank dropdown.
    expect(nipCodeForSelect('035A')).toBe('035A')
    expect(nipCodeForSelect('MFB50094')).toBe('MFB50094')
    expect(nipCodeForSelect('FC40128')).toBe('FC40128')
    expect(nipCodeForSelect('D53')).toBe('D53')
    expect(nipCodeForSelect('00zap')).toBe('00zap')
  })

  it('handles empty / nullish input', () => {
    expect(nipCodeForSelect(null)).toBe('')
    expect(nipCodeForSelect(undefined)).toBe('')
    expect(nipCodeForSelect('')).toBe('')
    expect(nipCodeForSelect('   ')).toBe('')
  })
})
