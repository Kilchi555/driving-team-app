/**
 * Public tenant-website SSR cache policy.
 *
 * Nitro's Vercel adapter matches routeRules by pathname only
 * (`getRouteRulesForPath` must not contain a query string). ISR is therefore
 * unable to distinguish:
 *
 *   /s/example
 *   /s/example?preview=<TOKEN>
 *
 * Enabling ISR on /s/** would store an authorized preview body under the
 * pathname key and later serve it without re-running authorization.
 *
 * This prefix is SSR-only. Shared/public HTML cache is disabled so a
 * preview or unpublished response cannot be reused from ISR/CDN.
 */
export const WEBSITE_PUBLIC_SSR_PATH = '/s/**'

export const WEBSITE_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'private, no-store',
  'Vercel-CDN-Cache-Control': 'private, no-store',
} as const

export const websitePublicSsrRouteRule = {
  ssr: true,
  isr: false,
  headers: { ...WEBSITE_NO_STORE_HEADERS },
} as const

/** Mirrors nitropack `generateFunctionFiles`: `if (!value.isr) continue`. */
export function vercelWritesIsrPrerenderConfig(isr: unknown): boolean {
  return Boolean(isr)
}

export function websiteSsrUsesSharedIsr(
  rule: { isr?: unknown } = websitePublicSsrRouteRule,
): boolean {
  return vercelWritesIsrPrerenderConfig(rule.isr)
}

/** Pathname only — the ISR cache identity Nitro/Vercel actually use. */
export function websiteSsrPathname(url: string): string {
  const q = url.indexOf('?')
  return q === -1 ? url : url.slice(0, q)
}

/**
 * True only when ISR is enabled and both URLs collapse to the same pathname.
 * With the production rule (`isr: false`) this is always false.
 */
export function websiteHtmlResponsesShareIsrCache(
  urlA: string,
  urlB: string,
  rule: { isr?: unknown } = websitePublicSsrRouteRule,
): boolean {
  if (!websiteSsrUsesSharedIsr(rule)) return false
  return websiteSsrPathname(urlA) === websiteSsrPathname(urlB)
}

/**
 * Shared CDN reuse of stored HTML. `private, no-store` on /s/** means the
 * edge must not store the body, so two URLs cannot share a stored entry.
 */
export function websiteHtmlResponsesSharePublicCdnEntry(
  urlA: string,
  urlB: string,
  rule: { headers?: Record<string, string> } = websitePublicSsrRouteRule,
): boolean {
  const cacheControl = String(rule.headers?.['Cache-Control'] || '')
  if (/\bno-store\b/i.test(cacheControl) || /\bprivate\b/i.test(cacheControl)) {
    return false
  }
  return urlA === urlB
}

export function shouldApplyWebsitePreviewNoStore(
  pathname: string,
  previewRaw: unknown,
): boolean {
  const preview = Array.isArray(previewRaw) ? previewRaw[0] : previewRaw
  if (preview == null || preview === false || String(preview).trim() === '') {
    return false
  }
  return pathname.startsWith('/s/') || pathname.startsWith('/api/public/website/')
}
