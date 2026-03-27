/** Laravel encrypted XSRF-TOKEN cookie value for `X-XSRF-TOKEN` header. */
export function readXsrfTokenFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const m = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return m ? decodeURIComponent(m[1].trim()) : ''
}

export function jsonFetchInit(body: unknown): RequestInit {
  return {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-XSRF-TOKEN': readXsrfTokenFromCookie(),
    },
    body: JSON.stringify(body),
  }
}
