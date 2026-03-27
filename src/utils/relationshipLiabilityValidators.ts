export type OutstandingLiabilityRow = {
  approved_amount?: string | number
  outstanding_balance?: string | number
  balance_error?: string
}

/** Ensures outstanding balance does not exceed approved amount (mutates row). */
export function validateLiabilityOutstandingVsApproved(liability: OutstandingLiabilityRow): void {
  const approvedAmount = parseFloat(String(liability.approved_amount)) || 0
  const outstandingBalance = parseFloat(String(liability.outstanding_balance)) || 0

  if (approvedAmount > 0 && outstandingBalance > approvedAmount) {
    liability.outstanding_balance = approvedAmount
    liability.balance_error = 'Outstanding balance cannot exceed approved amount'
    setTimeout(() => {
      liability.balance_error = ''
    }, 3000)
  } else {
    liability.balance_error = ''
  }
}
