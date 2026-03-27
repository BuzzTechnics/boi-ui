/** Inline error string or null when valid. */
export function incorporationDateError(date: string | null | undefined): string | null {
  if (date && new Date(date) > new Date()) {
    return 'Date cannot be in the future'
  }
  return null
}

export function tinLengthError(value: string | null | undefined): string | null {
  if (value && value.length < 10) {
    return 'TIN must be at least 10 digits'
  }
  return null
}

export function yearsOperatingError(value: string | null | undefined): string | null {
  const num = parseInt(String(value), 10)
  if (value !== '' && value != null && (Number.isNaN(num) || num < 0 || num > 100)) {
    return 'Years operating must be between 0 and 100'
  }
  return null
}

/** Prefix website with https:// when user omits scheme/www. */
export function normalizeBusinessWebsiteInput(value: string): string {
  if (value && !value.startsWith('http://') && !value.startsWith('https://') && !value.startsWith('www.')) {
    return `https://${value}`
  }
  return value
}
