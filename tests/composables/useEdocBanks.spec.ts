import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEdocBanks } from '../../src/composables/useEdocBanks'

describe('useEdocBanks', () => {
  const mockBanks = [
    { bankId: 1, name: 'Access Bank', bankCode: '044', enabled: true },
    { bankId: 2, name: 'GTBank', bankCode: '058', enabled: true },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty list when get returns empty', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] })
    const { loadBanksForStatement, edocBanks } = useEdocBanks({ get })

    await loadBanksForStatement()

    expect(edocBanks.value).toEqual([])
    expect(get).toHaveBeenCalledWith('/api/edoc/banks')
  })

  it('re-fetches on each call (no cross-call caching) but exposes the latest list', async () => {
    // The composable intentionally does NOT cache across calls so EDOC bank
    // additions/removals are visible immediately. See commit 431c569.
    const get = vi.fn().mockResolvedValue({ data: { success: true, data: mockBanks } })
    const { loadBanksForStatement, edocBanks } = useEdocBanks({ get })

    await loadBanksForStatement()
    expect(edocBanks.value).toHaveLength(2)
    expect(edocBanks.value[0].name).toBe('Access Bank')

    await loadBanksForStatement()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('normalizes array at data root', async () => {
    const get = vi.fn().mockResolvedValue({ data: mockBanks })
    const { loadBanksForStatement, edocBanks } = useEdocBanks({ get })

    await loadBanksForStatement()

    expect(edocBanks.value).toEqual(mockBanks)
  })

  it('sets loading during fetch', async () => {
    let resolve: (v: unknown) => void
    const get = vi.fn().mockImplementation(() => new Promise((r) => { resolve = r }))
    const { loadBanksForStatement, loading } = useEdocBanks({ get })

    const p = loadBanksForStatement()
    expect(loading.value).toBe(true)
    resolve!({ data: { success: true, data: mockBanks } })
    await p
    expect(loading.value).toBe(false)
  })

  it('invalidateCache clears cache', async () => {
    const get = vi.fn().mockResolvedValue({ data: { success: true, data: mockBanks } })
    const { loadBanksForStatement, invalidateCache, edocBanks } = useEdocBanks({ get })

    await loadBanksForStatement()
    expect(edocBanks.value).toHaveLength(2)
    invalidateCache()
    expect(edocBanks.value).toEqual([])
  })

  it('normalizes the bank-registered-email flag from either spelling and answers by code', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: [
          { bankId: 1, name: 'Fidelity', bankCode: '070', requires_bank_registered_email: true },
          { bankId: 2, name: 'ALAT', bankCode: '035A', requiresBankRegisteredEmail: false },
          { bankId: 3, name: 'GTB', bankCode: '058' },
        ],
      },
    })
    const { loadBanksForStatement, edocBanks, bankRequiresRegisteredEmail } = useEdocBanks({ get })

    await loadBanksForStatement()

    expect(edocBanks.value[0].requiresBankRegisteredEmail).toBe(true)
    expect(bankRequiresRegisteredEmail('070')).toBe(true)
    // EDOC sometimes strips leading zeroes; codes are matched as equivalents.
    expect(bankRequiresRegisteredEmail('70')).toBe(true)
    expect(bankRequiresRegisteredEmail('058')).toBe(false)
    expect(bankRequiresRegisteredEmail('')).toBe(false)
  })

  it('uses fallback URL when primary fails', async () => {
    const get = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: mockBanks })
    const { loadBanksForStatement, edocBanks } = useEdocBanks({
      get,
      getBanksUrl: '/api/edoc/banks',
      fallbackBanksUrl: '/api/banks',
    })

    await loadBanksForStatement()

    expect(get).toHaveBeenCalledWith('/api/edoc/banks')
    expect(get).toHaveBeenCalledWith('/api/banks')
    expect(edocBanks.value).toEqual(mockBanks)
  })
})
