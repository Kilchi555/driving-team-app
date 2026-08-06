/** Single source of truth for public pricing claims on simy.ch */
export const STARTING_PRICE_CHF = 49

export const REGISTER_BASE = 'https://app.simy.ch/tenant-register'

export function registerUrl(businessType?: string, refCode?: string) {
  const params = new URLSearchParams()
  if (businessType) params.set('type', businessType)
  if (refCode) params.set('ref', refCode.trim().toUpperCase())
  const q = params.toString()
  return q ? `${REGISTER_BASE}?${q}` : REGISTER_BASE
}

/** Client-only: append stored ?ref= from marketing middleware to register URLs. */
export function registerUrlWithStoredRef(businessType?: string): string {
  let ref: string | undefined
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('platform_ref')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed?.code && parsed?.expires && Date.now() <= parsed.expires) {
          ref = String(parsed.code)
        }
      }
    } catch { /* ignore */ }
  }
  return registerUrl(businessType, ref)
}

export const PRICE_FROM_COPY = `ab CHF ${STARTING_PRICE_CHF}/Monat`
