/** NIP-style codes: EDOC and Paystack often use 3 digits (e.g. 057); DB may store "57". */
export function nipCodeForSelect(code: unknown): string {
  if (code == null || code === '') return ''
  const digits = String(code).replace(/\D/g, '')
  if (digits === '') return String(code).trim()
  if (digits.length <= 3) return digits.padStart(3, '0')
  return digits
}
