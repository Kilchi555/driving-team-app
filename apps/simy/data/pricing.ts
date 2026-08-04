/** Single source of truth for public pricing claims on simy.ch */
export const STARTING_PRICE_CHF = 49

export const REGISTER_BASE = 'https://app.simy.ch/tenant-register'

export function registerUrl(businessType?: string) {
  if (!businessType) return REGISTER_BASE
  return `${REGISTER_BASE}?type=${encodeURIComponent(businessType)}`
}

export const PRICE_FROM_COPY = `ab CHF ${STARTING_PRICE_CHF}/Monat`
