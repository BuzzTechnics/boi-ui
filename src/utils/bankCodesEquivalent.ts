/**
 * Aligns with PHP {@see \App\Services\EdocService::bankCodesEquivalent}:
 * Paystack / local DB often use 3-digit NIP codes (e.g. "057") while EDOC may return "57".
 */
export function bankCodesEquivalent(fromApi: string, fromStatement: string): boolean {
  const a = (fromApi ?? '').trim()
  const b = (fromStatement ?? '').trim()
  if (a === '' || b === '') return false
  if (a.toLowerCase() === b.toLowerCase()) return true

  const digitsApi = a.replace(/\D/g, '')
  const digitsStmt = b.replace(/\D/g, '')
  if (digitsApi === '' || digitsStmt === '') return false
  if (digitsApi === digitsStmt) return true

  return parseInt(digitsApi, 10) === parseInt(digitsStmt, 10)
}

/** Collect possible NIP / sort codes from an EDOC master row (keys vary by API version). */
export function edocRowCodeCandidates(row: Record<string, unknown>): string[] {
  const keys = ['bankCode', 'BankCode', 'bank_code', 'code', 'cbnCode', 'nipCode', 'sortCode'] as const
  const out: string[] = []
  for (const k of keys) {
    const v = row[k]
    if (v == null) continue
    const s = String(v).trim()
    if (s !== '') out.push(s)
  }
  return out
}

export function edocRowMatchesLocalBank(
  localBankCode: string,
  row: Record<string, unknown>,
  localBankNames: string[],
  enabledOnly: boolean,
  localEdocBankId?: number | null
): boolean {
  if (enabledOnly && row.enabled === false) return false

  // Prefer the explicit edoc bank id pairing when both sides know it — this
  // resolves sub-brands (e.g. ALAT by WEMA, code 035A) to their EDOC parent
  // (Wema, code 035) without relying on code/name heuristics.
  if (localEdocBankId != null && typeof row.bankId === 'number' && row.bankId === localEdocBankId) {
    return true
  }

  if (!localBankCode) return false

  const codes = edocRowCodeCandidates(row)
  if (codes.some((c) => bankCodesEquivalent(c, localBankCode))) return true

  const en = row.name
  if (typeof en !== 'string' || !en) return false
  const lower = en.toLowerCase()
  return localBankNames.some((n) => {
    if (!n) return false
    const nl = n.toLowerCase()
    // Accept either direction, since providers may use abbreviations
    // (e.g. "FCMB Bank" vs "First City Monument Bank").
    return lower.includes(nl) || nl.includes(lower)
  })
}
