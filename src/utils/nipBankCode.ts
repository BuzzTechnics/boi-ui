/**
 * NIP-style codes: EDOC and Paystack often use 3 digits (e.g. 057); DB may store "57".
 * Codes that intentionally include letters (e.g. "035A" for ALAT by WEMA, "MFB50094",
 * "FC40128", "D53") are preserved as-is — stripping letters would collapse distinct
 * banks onto the same value (035A → 035 collides with Wema Bank's 035) and produce
 * duplicate Vue keys downstream.
 */
export function nipCodeForSelect(code: unknown): string {
  if (code == null || code === '') return ''
  const trimmed = String(code).trim()
  if (trimmed === '') return ''
  // Non-digit-bearing or mixed codes pass through unchanged so distinct banks
  // (035 vs 035A, FC40128 vs 40128, etc.) keep distinct values.
  if (!/^\d+$/.test(trimmed)) return trimmed
  if (trimmed.length <= 3) return trimmed.padStart(3, '0')
  return trimmed
}
