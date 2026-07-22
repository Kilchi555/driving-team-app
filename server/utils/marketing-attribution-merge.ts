/**
 * Merge marketing attribution without clobbering existing click IDs.
 * Used by both drivingteam.ch and app.simy.ch attribution upserts.
 */

export interface AttributionFields {
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
}

const CLICK_ID_FIELDS = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'fbc', 'fbp'] as const
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

const LOW_VALUE_SOURCES = new Set(['direct', 'drivingteam_direct', 'none'])

export function mergeAttributionFields(
  existing: AttributionFields | null | undefined,
  incoming: AttributionFields | null | undefined,
): AttributionFields {
  const merged: AttributionFields = { ...(existing ?? {}) }
  if (!incoming) return merged

  for (const field of CLICK_ID_FIELDS) {
    const value = incoming[field]
    if (value) merged[field] = value
  }

  for (const field of UTM_FIELDS) {
    const value = incoming[field]
    if (!value) continue
    const existingValue = merged[field]
    if (!existingValue || LOW_VALUE_SOURCES.has(String(existingValue).toLowerCase())) {
      merged[field] = value
    } else if (!LOW_VALUE_SOURCES.has(String(value).toLowerCase())) {
      merged[field] = value
    }
  }

  if (incoming.landing_page) {
    merged.landing_page = incoming.landing_page
  }

  return merged
}

export function hasClickId(attr: AttributionFields | null | undefined): boolean {
  return !!(attr?.gclid || attr?.gbraid || attr?.wbraid)
}

export function hasAnyAttribution(attr: AttributionFields | null | undefined): boolean {
  if (!attr) return false
  return !!(
    attr.gclid || attr.gbraid || attr.wbraid || attr.fbclid
    || attr.utm_source || attr.utm_medium || attr.utm_campaign
  )
}
