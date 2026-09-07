import { describe, it, expect } from 'vitest'
import {
  validateFinancedItemName,
  validateAssetName,
} from '../../src/utils/creditFacilityValidators'

describe('creditFacilityValidators — name fields accept digits', () => {
  it('allows digits in a financed item name', () => {
    const item: { name_error?: string } = {}
    validateFinancedItemName('Toyota Hilux 2020', item)
    expect(item.name_error).toBe('')
  })

  it('still rejects unsupported symbols in an item name', () => {
    const item: { name_error?: string } = {}
    validateFinancedItemName('Widget @#$', item)
    expect(item.name_error).toBeTruthy()
  })

  it('allows digits in an asset name', () => {
    const asset: { name_error?: string } = {}
    validateAssetName('Plot 15 Land', asset)
    expect(asset.name_error).toBe('')
  })
})
