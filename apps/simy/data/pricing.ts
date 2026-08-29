/** Single source of truth for public pricing claims on simy.ch */
export const STARTING_PRICE_CHF = 49

/** Website-only product (not the Simy SaaS Starter plan) */
export const WEBSITE_SETUP_CHF = 490
export const WEBSITE_HOST_CHF = 19
export const WEBSITE_CARE_CHF = 49
/** Google Business Profile add-on (Simy SaaS + optional later for website) */
export const ADDON_GBP_CHF = 19

export const REGISTER_BASE = 'https://app.simy.ch/tenant-register'
export const PLATFORM_REF_STORAGE_KEY = 'platform_ref'

export function registerUrl(businessType?: string, refCode?: string) {
  const params = new URLSearchParams()
  if (businessType) params.set('type', businessType)
  if (refCode) params.set('ref', refCode.trim().toUpperCase())
  const q = params.toString()
  return q ? `${REGISTER_BASE}?${q}` : REGISTER_BASE
}

export function registerWebsiteUrl(businessType?: string, refCode?: string) {
  const params = new URLSearchParams()
  params.set('product', 'website')
  if (businessType) params.set('type', businessType)
  if (refCode) params.set('ref', refCode.trim().toUpperCase())
  return `${REGISTER_BASE}?${params.toString()}`
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

export function registerWebsiteUrlWithStoredRef(businessType?: string, explicitRef?: string): string {
  return registerWebsiteUrl(businessType, explicitRef || getStoredPlatformRef())
}

/** Ensure an absolute register URL carries the current platform ref. */
export function withPlatformRef(href: string, explicitRef?: string): string {
  const ref = (explicitRef || getStoredPlatformRef() || '').trim().toUpperCase()
  if (!ref) return href
  try {
    const url = new URL(href, typeof window !== 'undefined' ? window.location.origin : 'https://www.simy.ch')
    if (!url.hostname.includes('simy.ch')) return href
    if (!url.pathname.includes('tenant-register')) return href
    if (!url.searchParams.has('ref')) url.searchParams.set('ref', ref)
    return url.toString()
  } catch {
    return href
  }
}

export const PRICE_FROM_COPY = `ab CHF ${STARTING_PRICE_CHF}/Monat`

/** Simy is not VAT-registered until Oct 2026; listed prices are net. */
export const PRICE_VAT_RATE_PERCENT = 0
/** Swiss standard VAT rate (MWSTG, unchanged since 1.1.2024). */
export const PRICE_VAT_STANDARD_PERCENT = 8.1
export const PRICE_VAT_STANDARD_FROM = 'Oktober 2026'
export const PRICE_VAT_NOTE = `Alle Preise exkl. MwSt. Aktuell beträgt die MwSt. ${PRICE_VAT_RATE_PERCENT} %. Ab ${PRICE_VAT_STANDARD_FROM} gilt der offizielle Normalsatz von ${PRICE_VAT_STANDARD_PERCENT} %.`
export const PRICE_VAT_NOTE_SHORT = `exkl. MwSt. (aktuell ${PRICE_VAT_RATE_PERCENT} %, ab Okt. 2026 ${PRICE_VAT_STANDARD_PERCENT} %)`

export const WALLEE_FEE_PERCENT = '1.7%'
export const WALLEE_FEE_NOTE =
  `Online-Zahlungen (TWINT, Karte) über Wallee: ${WALLEE_FEE_PERCENT} Transaktionsgebühr pro Kundenzahlung — kein monatlicher Aufpreis.`
export const WALLEE_FEE_PRICE_TIP =
  'Viele Betriebe heben ihre Preise um 2–3 % an. Die App hat laufende Kosten, die Gebühr ist damit gedeckt, es bleibt ein kleiner Gewinn — und automatische Zahlungen sparen Zeit und Nachfassen.'
export const WALLEE_FEE_FAQ =
  `Für deine Kunden unterstützen wir TWINT, PostFinance, Kreditkarte und Banküberweisung – alles integriert und ohne extra Setup. Für Online-Zahlungen via Wallee fällt eine Transaktionsgebühr von ${WALLEE_FEE_PERCENT} pro Zahlung an. ${WALLEE_FEE_PRICE_TIP}`
