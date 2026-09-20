/**
 * Public tenant-website SSR cache policy.
 *
 * /s/** cannot distinguish published vs unpublished at the Vercel ISR layer.
 * ISR is therefore disabled for the entire prefix. Shared/public HTML cache
 * is also disabled so a preview response cannot be reused without
 * re-running authorization.
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

/** Mirrors nitropack 2.13.4 `generateFunctionFiles`: `if (!value.isr) continue`. */
export function vercelWritesIsrPrerenderConfig(isr: unknown): boolean {
  return Boolean(isr)
}

export function websiteSsrUsesSharedIsr(
  rule: { isr?: unknown } = websitePublicSsrRouteRule,
): boolean {
  return vercelWritesIsrPrerenderConfig(rule.isr)
}

/**
 * Without ISR there is no prerender cache object, so anonymous and preview
 * URLs cannot collapse onto one cached HTML body.
 */
export function websiteHtmlResponsesShareIsrCache(
  _anonymousPath: string,
  _previewPath: string,
  rule: { isr?: unknown } = websitePublicSsrRouteRule,
): boolean {
  return websiteSsrUsesSharedIsr(rule)
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
