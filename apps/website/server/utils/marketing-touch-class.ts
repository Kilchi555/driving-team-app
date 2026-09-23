/**
 * Classify one observation into a marketing_touches.attribution_class.
 * Click IDs decide paid class. utm_source=google alone is not paid.
 * _fbp alone is not a Meta click.
 */

import { createHash } from 'node:crypto'

export const MARKETING_TOUCH_CLASSES = [
  'PAID_GOOGLE',
  'PAID_META',
  'CHATGPT',
  'DIRECT_CONFIRMED',
  'ORGANIC_CONFIRMED',
  'OTHER_REFERRER',
  'NO_MARKETING_SIGNAL',
] as const

export type MarketingTouchClass = (typeof MARKETING_TOUCH_CLASSES)[number]

export const MARKETING_SESSION_ID_PATTERN = /^[0-9]+_[0-9a-z]{9}$/

const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paid_social', 'paid-social', 'paidsocial'])
const GOOGLE_SOURCES = new Set(['google', 'google ads', 'googleads'])
const META_SOURCES = new Set(['facebook', 'instagram', 'meta', 'fb', 'ig'])
const DIRECT_SOURCES = new Set(['direct', 'none'])
const ORGANIC_HOSTS = ['google.', 'bing.', 'duckduckgo.', 'ecosia.', 'search.yahoo.']

export type TouchObservation = {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  fbclid?: string | null
  fbc?: string | null
  fbp?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  landing_page?: string | null
  referrer?: string | null
}

function clean(value: string | null | undefined): string | null {
  if (value == null) return null
  const v = String(value).trim()
  if (!v || v === 'undefined' || v === 'null') return null
  return v.slice(0, 512)
}

function lower(value: string | null | undefined): string {
  return (clean(value) || '').toLowerCase()
}

export function referrerHost(referrer: string | null | undefined): string | null {
  const raw = clean(referrer)
  if (!raw) return null
  try {
    const withProtocol = raw.includes('://') ? raw : `https://${raw}`
    return new URL(withProtocol).hostname.toLowerCase()
  } catch {
    return null
  }
}

function isChatGpt(source: string, host: string | null): boolean {
  return source === 'chatgpt.com' || source === 'chatgpt' || source === 'openai'
    || (!!host && (host === 'chatgpt.com' || host.endsWith('.chatgpt.com') || host === 'chat.openai.com'))
}

function isOrganicHost(host: string | null): boolean {
  if (!host) return false
  return ORGANIC_HOSTS.some(part => host.includes(part))
}

export function classifyMarketingTouch(input: TouchObservation | null | undefined): MarketingTouchClass {
  const gclid = clean(input?.gclid)
  const gbraid = clean(input?.gbraid)
  const wbraid = clean(input?.wbraid)
  const fbclid = clean(input?.fbclid)
  const fbc = clean(input?.fbc)
  const source = lower(input?.utm_source)
  const medium = lower(input?.utm_medium)
  const host = referrerHost(input?.referrer)

  if (gclid || gbraid || wbraid) return 'PAID_GOOGLE'
  if (fbclid || fbc) return 'PAID_META'
  if (GOOGLE_SOURCES.has(source) && PAID_MEDIUMS.has(medium)) return 'PAID_GOOGLE'
  if (META_SOURCES.has(source) && medium !== 'organic' && (PAID_MEDIUMS.has(medium) || medium === '')) {
    if (PAID_MEDIUMS.has(medium)) return 'PAID_META'
  }
  if (isChatGpt(source, host)) return 'CHATGPT'
  if (DIRECT_SOURCES.has(source) && (medium === 'none' || medium === 'direct' || medium === '')) {
    return 'DIRECT_CONFIRMED'
  }
  if (source === 'drivingteam_direct') return 'NO_MARKETING_SIGNAL'
  if (medium === 'organic' || isOrganicHost(host)) return 'ORGANIC_CONFIRMED'
  if (source || medium || clean(input?.utm_campaign) || host) return 'OTHER_REFERRER'
  return 'NO_MARKETING_SIGNAL'
}

export function isIdentifiableTouch(touchClass: MarketingTouchClass): boolean {
  return touchClass !== 'NO_MARKETING_SIGNAL'
}

/** Earliest identifiable touch at or before the conversion. Not last-touch. */
export function pickConversionTouch<T extends {
  attribution_class: MarketingTouchClass
  touch_at: string
  tenant_id: string
}>(rows: T[], tenantId: string, conversionAt: string): {
  touch: T | null
  touchClass: MarketingTouchClass | null
} {
  const conversionMs = new Date(conversionAt).getTime()
  const owned = rows.filter(row => row.tenant_id === tenantId)
  const identifiable = owned
    .filter(row => isIdentifiableTouch(row.attribution_class) && new Date(row.touch_at).getTime() <= conversionMs)
    .sort((a, b) => new Date(a.touch_at).getTime() - new Date(b.touch_at).getTime())
  if (identifiable.length) return { touch: identifiable[0], touchClass: identifiable[0].attribution_class }
  if (owned.some(row => row.attribution_class === 'NO_MARKETING_SIGNAL')) {
    return { touch: null, touchClass: 'NO_MARKETING_SIGNAL' }
  }
  return { touch: null, touchClass: null }
}

export type CustomerState = 'new' | 'existing' | 'unknown'
export type ConversionEvent = 'appointment' | 'course' | 'inquiry'

export function describeMarketingConversion(input: {
  event: ConversionEvent
  customerState: CustomerState
  touchClass: MarketingTouchClass | null
}): {
  conversion_type: 'booking' | 'course' | 'inquiry' | 'follow_up'
  signal_state: 'credited' | 'no_marketing_signal' | 'unknown'
  customer_state: CustomerState
  credit_touch: boolean
} {
  const credit_touch = !!input.touchClass && isIdentifiableTouch(input.touchClass)
  const signal_state = credit_touch
    ? 'credited'
    : input.touchClass === 'NO_MARKETING_SIGNAL'
      ? 'no_marketing_signal'
      : 'unknown'

  let conversion_type: 'booking' | 'course' | 'inquiry' | 'follow_up'
  if (input.event === 'inquiry') conversion_type = 'inquiry'
  else if (input.customerState === 'existing') conversion_type = 'follow_up'
  else if (input.event === 'course') conversion_type = 'course'
  else conversion_type = 'booking'

  return {
    conversion_type,
    signal_state,
    customer_state: input.customerState,
    credit_touch,
  }
}

export function marketingTouchIdempotencyKey(input: {
  tenantId: string
  sessionId: string
  touchClass: MarketingTouchClass
  observation: TouchObservation
}): string {
  // Stable across retries. touch_at is intentionally absent.
  // fbc distinguishes Meta clicks that have no fbclid yet.
  // referrer host distinguishes organic engines without collapsing on query strings.
  const parts = [
    input.tenantId,
    input.sessionId,
    input.touchClass,
    clean(input.observation.gclid) || '',
    clean(input.observation.gbraid) || '',
    clean(input.observation.wbraid) || '',
    clean(input.observation.fbclid) || '',
    clean(input.observation.fbc) || '',
    lower(input.observation.utm_source),
    lower(input.observation.utm_medium),
    clean(input.observation.utm_campaign) || '',
    clean(input.observation.utm_content) || '',
    clean(input.observation.utm_term) || '',
    clean(input.observation.landing_page) || '',
    referrerHost(input.observation.referrer) || '',
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex')
}
