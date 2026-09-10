/**
 * Redact bearer secrets from URLs before they are persisted to logs.
 * Keeps path + other query keys for debugging.
 */
const REDACT_QUERY_KEYS = [
  'token',
  'invitation_token',
  'invitationToken',
  'access_token',
  'refresh_token',
  'token_hash',
  'code',
] as const

const REDACTED = '[REDACTED]'

export function redactSensitiveUrl(href: string | null | undefined): string {
  if (!href) return ''

  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(href)
    const url = hasScheme ? new URL(href) : new URL(href, 'https://placeholder.invalid')
    let changed = false
    for (const key of REDACT_QUERY_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, REDACTED)
        changed = true
      }
    }
    const decodedRedacted = (value: string) => value.replaceAll('%5BREDACTED%5D', REDACTED)
    if (!changed && !hasScheme) return href
    if (!hasScheme) {
      return decodedRedacted(url.pathname + url.search + url.hash)
    }
    return decodedRedacted(url.toString())
  } catch {
    return href.replace(
      /([?&#](?:token|invitation_token|invitationToken|access_token|refresh_token|token_hash|code)=)[^&\s#]*/gi,
      `$1${REDACTED}`,
    )
  }
}

/**
 * Origin + pathname only. Query strings and hashes are never safe to log
 * (invite tokens, reset tokens, OAuth codes, unknown secret param names).
 */
export function urlWithoutQueryForLogs(href: string | null | undefined): string {
  if (!href || href === 'unknown') return 'unknown'
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      const url = new URL(href)
      return `${url.origin}${url.pathname}`
    }
    if (href.startsWith('/')) {
      const url = new URL(href, 'https://placeholder.invalid')
      return url.pathname
    }
    return 'unknown'
  } catch {
    return 'unknown'
  }
}
