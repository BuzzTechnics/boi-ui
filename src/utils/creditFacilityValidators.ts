/** Item / asset row validators used in credit facility forms (mutate row error fields). */

export function validateFinancedItemName(value: string, item: { name_error?: string }): void {
  const pattern = /^[A-Za-z\s\-]+$/
  if (value && !pattern.test(value)) {
    item.name_error = 'Item name can only contain letters, spaces, and hyphens'
  } else {
    item.name_error = ''
  }
}

export function validateFinancedItemQuantity(value: string, item: { quantity_error?: string }): void {
  const quantity = parseFloat(value)
  if (quantity <= 0) {
    item.quantity_error = 'Quantity must be greater than 0'
  } else {
    item.quantity_error = ''
  }
}

export function validateAssetName(value: string, asset: { name_error?: string }): void {
  const pattern = /^[A-Za-z\s\-]+$/
  if (value && !pattern.test(value)) {
    asset.name_error = 'Asset name can only contain letters, spaces, and hyphens'
  } else {
    asset.name_error = ''
  }
}

export function validateAssetMarketValue(
  value: string,
  asset: {
    forced_sale_value?: string
    market_value_error?: string
  },
): void {
  const marketValue = parseFloat(value)
  const forcedSaleValue = parseFloat(String(asset.forced_sale_value)) || 0

  if (marketValue < forcedSaleValue) {
    asset.forced_sale_value = value
    asset.market_value_error =
      'Market value cannot be less than forced sale value. Forced sale value has been reset.'
  } else {
    asset.market_value_error = ''
  }
}

export function validateAssetForcedSaleValue(
  value: string,
  asset: {
    market_value?: string
    forced_sale_value?: string
    forced_sale_value_error?: string
  },
): void {
  const forcedSaleValue = parseFloat(value)
  const marketValue = parseFloat(String(asset.market_value)) || 0

  if (forcedSaleValue > marketValue) {
    asset.forced_sale_value = asset.market_value
    asset.forced_sale_value_error =
      'Forced sale value cannot be greater than market value. Value has been reset.'
  } else {
    asset.forced_sale_value_error = ''
  }
}

export type ConsolidatedFacilityForm = {
  consolidated_amount_accessed?: string | number
  current_outstanding_balance?: string | number
  errors: Record<string, string | undefined | null>
}

export function validateConsolidatedOutstandingBalance(
  value: string,
  form: ConsolidatedFacilityForm,
): void {
  const outstandingBalance = parseFloat(value) || 0
  const amountAccessed = parseFloat(String(form.consolidated_amount_accessed)) || 0

  if (outstandingBalance > amountAccessed) {
    form.current_outstanding_balance = form.consolidated_amount_accessed
    form.errors.current_outstanding_balance =
      'Outstanding balance cannot exceed amount accessed. Value has been reset.'
  } else {
    form.errors.current_outstanding_balance = ''
  }
}

export function validateConsolidatedAmountAccessed(
  value: string,
  form: ConsolidatedFacilityForm,
): void {
  const amountAccessed = parseFloat(value) || 0
  const outstandingBalance = parseFloat(String(form.current_outstanding_balance)) || 0

  if (outstandingBalance > amountAccessed) {
    form.current_outstanding_balance = value
    form.errors.current_outstanding_balance =
      'Outstanding balance has been reset to match amount accessed.'
  } else {
    form.errors.current_outstanding_balance = ''
  }
}
