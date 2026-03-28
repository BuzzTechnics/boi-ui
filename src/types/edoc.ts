export interface EdocBank {
  bankId: number
  name: string
  icon?: string
  bankCode: string
  code?: string
  enabled?: boolean
  mandateEnabled?: boolean
  bankInstructions?: string[]
}

export interface BankStatementRecord {
  id: number
  loan_application_id?: number
  bank: string
  account_number: string
  account_name?: string
  account_type?: string
  bvn?: string
  email: string
  bank_statement?: string
  /**
   * Client-only: S3 key for the uploaded PDF used for “View document”.
   * Kept when API/poll sets `bank_statement` to the EDOC CSV object key.
   */
  uploaded_statement_path?: string
  /** Presigned or public URL from API (Boi BankStatement $appends) */
  bank_statement_view_url?: string | null
  csv_url?: string
  csv_view_url?: string | null
  consent_id?: string
  edoc_status: 'pending' | 'processing' | 'completed' | 'failed'
  statement_generated: boolean
  otp?: string
  showOtpInput?: boolean
}

export interface EdocConsentInitializePayload {
  email: string
  firstName: string
  lastName: string
  statementDuration?: string
  redirectionUrl?: string
  referenceId?: string
  state?: string
  fundType?: string
  industrialSector?: string
}

export interface EdocAttachAccountPayload {
  consentId: string
  bankId: number
  accountNumber: string
  accountType?: string
  statementDuration?: string
  monthType?: string
  uploadType?: string
}

export interface EdocGetTransactionsPayload {
  consentId: string
  verificationCode?: string
  bankStatementId?: number
}

export interface BankOption {
  value: string
  label: string
  /** Shown in search (e.g. FCMB); also include in searchKeywords if you only pass one */
  shortName?: string
  searchKeywords?: string[]
}

export interface IndustrialSectorOption {
  value: string | number
  label?: string
  name?: string
  id?: string | number
}
