import { ref, type Ref } from 'vue'

export type UseBankVerificationOptions = {
  /**
   * Full URL template with `{account_number}` and `{bank_code}` placeholders, or
   * a function returning the URL for a given account number and bank code.
   */
  verifyUrl?:
    | string
    | ((accountNumber: string, bankCode: string) => string)
  /** Default: `https://fikets.com/api/verify-bank?account_number={account_number}&bank_code={bank_code}` */
  defaultVerifyPattern?: string
}

const DEFAULT_PATTERN =
  'https://fikets.com/api/verify-bank?account_number={account_number}&bank_code={bank_code}'

function buildUrl(
  accountNumber: string,
  bankCode: string,
  opts: UseBankVerificationOptions,
): string {
  if (typeof opts.verifyUrl === 'function') {
    return opts.verifyUrl(accountNumber, bankCode)
  }
  const pattern = opts.verifyUrl ?? opts.defaultVerifyPattern ?? DEFAULT_PATTERN
  return pattern
    .replace('{account_number}', encodeURIComponent(accountNumber))
    .replace('{bank_code}', encodeURIComponent(bankCode))
}

export function useBankVerification(opts: UseBankVerificationOptions = {}) {
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  const verifyBankAccount = async (accountNumber: string, bankCode: string) => {
    try {
      loading.value = true
      error.value = null

      const url = buildUrl(accountNumber, bankCode, opts)
      const response = await fetch(url)
      const result = (await response.json()) as {
        status?: boolean
        data?: { account_name?: string; accountName?: string }
        message?: string
      }

      if (result.status && result.data) {
        return result.data
      }
      error.value = result.message || 'Failed to verify account'
      return null
    } catch {
      error.value = 'Failed to verify bank account'
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    verifyBankAccount,
  }
}
