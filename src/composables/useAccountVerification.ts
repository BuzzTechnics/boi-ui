import { ref } from 'vue'

export interface VerificationState {
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  errorMessage?: string
}

const verificationStates = ref<Record<string, VerificationState>>({})

export type VerifyBankAccountFn = (
  accountNumber: string,
  bankCode: string
) => Promise<{ account_name?: string; accountName?: string } | null>

export function useAccountVerification(
  verifyBankAccount?: VerifyBankAccountFn | (() => VerifyBankAccountFn | null | undefined) | null
) {
  const getVerifyFn = (): VerifyBankAccountFn | null | undefined =>
    typeof verifyBankAccount === 'function' && verifyBankAccount.length === 0
      ? (verifyBankAccount as () => VerifyBankAccountFn | null | undefined)()
      : (verifyBankAccount as VerifyBankAccountFn | null | undefined)
  const getVerificationKey = (account: { bank?: string; account_number?: string }) =>
    `${account.bank ?? ''}_${account.account_number ?? ''}`

  const getVerificationState = (account: { bank?: string; account_number?: string }): VerificationState => {
    const key = getVerificationKey(account)
    return (
      verificationStates.value[key] ?? {
        isLoading: false,
        isSuccess: false,
        isError: false,
      }
    )
  }

  const clearAccountName = (account: { account_name?: string }) => {
    account.account_name = ''
  }

  const handleAccountVerification = async (account: {
    bank?: string
    account_number?: string
    account_name?: string
  }) => {
    const bankCode = account.bank
    const accountNumber = account.account_number
    const key = getVerificationKey(account)
    const fn = getVerifyFn()

    if (!fn || !bankCode || !accountNumber || accountNumber.length !== 10) {
      delete verificationStates.value[key]
      if (accountNumber?.length !== 10) clearAccountName(account)
      return
    }

    clearAccountName(account)
    verificationStates.value[key] = { isLoading: true, isSuccess: false, isError: false }

    try {
      const result = await fn(accountNumber, bankCode)
      const name = result?.account_name ?? result?.accountName ?? ''
      if (name) {
        account.account_name = name
        verificationStates.value[key] = { isLoading: false, isSuccess: true, isError: false }
      } else {
        verificationStates.value[key] = {
          isLoading: false,
          isSuccess: false,
          isError: true,
          errorMessage: 'Account verification failed',
        }
      }
    } catch (err) {
      verificationStates.value[key] = {
        isLoading: false,
        isSuccess: false,
        isError: true,
        errorMessage: err instanceof Error ? err.message : 'Verification failed',
      }
    }
  }

  const retryVerification = (account: { bank?: string; account_number?: string; account_name?: string }) => {
    return handleAccountVerification(account)
  }

  return {
    handleAccountVerification,
    retryVerification,
    getVerificationState,
    clearAccountName,
  }
}
