/**
 * Client-side preview query. The raw token stays in the URL the owner opened.
 * It is not used as a cache key and `?preview=1` is not treated as access.
 */

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

export function readRoutePreviewToken(query: Record<string, unknown> | null | undefined): string {
  const raw = query?.preview_token
  const value = Array.isArray(raw) ? raw[0] : raw
  const token = String(value || '').trim()
  if (!TOKEN_PATTERN.test(token)) return ''
  return token
}

/** Stable tag for useAsyncData. Not the token. */
export function previewDataKey(token: string): string {
  if (!token) return 'live'
  let h = 2166136261
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `d${(h >>> 0).toString(16)}`
}

export function previewQuerySuffix(token: string): string {
  if (!token) return ''
  return `?preview_token=${encodeURIComponent(token)}`
}

export function withPreviewToken(href: string, token: string): string {
  if (!token || !href) return href
  if (/^(https?:|mailto:|tel:)/i.test(href)) return href
  const hashAt = href.indexOf('#')
  const hash = hashAt >= 0 ? href.slice(hashAt) : ''
  const before = hashAt >= 0 ? href.slice(0, hashAt) : href
  if (!before.startsWith('/s/')) return href
  const qAt = before.indexOf('?')
  const path = qAt >= 0 ? before.slice(0, qAt) : before
  const params = new URLSearchParams(qAt >= 0 ? before.slice(qAt + 1) : '')
  params.set('preview_token', token)
  return `${path}?${params.toString()}${hash}`
}
