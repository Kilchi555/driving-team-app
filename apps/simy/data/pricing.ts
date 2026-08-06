/** Single source of truth for public pricing claims on simy.ch */
export const STARTING_PRICE_CHF = 49

export const REGISTER_BASE = 'https://app.simy.ch/tenant-register'
export const PLATFORM_REF_STORAGE_KEY = 'platform_ref'

export function registerUrl(businessType?: string, refCode?: string) {
  const params = new URLSearchParams()
  if (businessType) params.set('type', businessType)
  if (refCode) params.set('ref', refCode.trim().toUpperCase())
  const q = params.toString()
  return q ? `${REGISTER_BASE}?${q}` : REGISTER_BASE
}

/** Read invite code from localStorage (client only). */
export function getStoredPlatformRef(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const raw = localStorage.getItem(PLATFORM_REF_STORAGE_KEY)
    if (!raw) return undefined
    const parsed = JSON.parse(raw)
    if (!parsed?.code || !parsed?.expires) return undefined
    if (Date.now() > parsed.expires) {
      localStorage.removeItem(PLATFORM_REF_STORAGE_KEY)
      return undefined
    }
    return String(parsed.code).trim().toUpperCase()
  } catch {
    return undefined
  }
}

/** Persist invite code (also called from middleware). */
export function storePlatformRef(code: string): void {
  if (typeof window === 'undefined') return
  const normalized = code.trim().toUpperCase()
  if (!normalized) return
  const payload = JSON.stringify({
    code: normalized,
    expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  })
  try {
    localStorage.setItem(PLATFORM_REF_STORAGE_KEY, payload)
    localStorage.setItem('affiliate_ref', payload)
  } catch { /* ignore */ }
}

/** Client-only: append stored ?ref= from marketing middleware to register URLs. */
export function registerUrlWithStoredRef(businessType?: string, explicitRef?: string): string {
  return registerUrl(businessType, explicitRef || getStoredPlatformRef())
}

/** Ensure an absolute register URL carries the current platform ref. */
export function withPlatformRef(href: string, explicitRef?: string): string {
  const ref = (explicitRef || getStoredPlatformRef() || '').trim().toUpperCase()
  if (!ref) return href
  try {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://simy.ch')
    if (!url.hostname.includes('simy.ch')) return href
    if (!url.pathname.includes('tenant-register')) return href
    if (!url.searchParams.has('ref')) url.searchParams.set('ref', ref)
    return url.toString()
  } catch {
    return href
  }
}

export const PRICE_FROM_COPY = `ab CHF ${STARTING_PRICE_CHF}/Monat`
