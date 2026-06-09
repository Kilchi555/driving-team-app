/**
 * Decode the marketing attribution blob (dt_attr URL parameter) sent by
 * drivingteam.ch when a user lands on a booking page on app.simy.ch.
 *
 * Symmetrical to apps/website/utils/attribution-encode.ts — both files must
 * stay in sync. The blob is base64url-encoded JSON containing gclid, gbraid,
 * wbraid and UTM parameters.
 */

export interface DecodedAttribution {
  gclid?: string | null
  gbraid?: string | null
  wbraid?: string | null
  /** Meta click ID captured on drivingteam.ch. */
  fbclid?: string | null
  /** Meta browser click cookie (_fbc) for CAPI deduplication. */
  fbc?: string | null
  /** Meta browser ID cookie (_fbp) for CAPI audience matching. */
  fbp?: string | null
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  landing_page?: string | null
}

function base64UrlDecode(input: string): string | null {
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = padded.length % 4
    const fullyPadded = pad ? padded + '='.repeat(4 - pad) : padded
    // atob → Latin1 → re-decode via decodeURIComponent to recover UTF-8.
    return decodeURIComponent(escape(atob(fullyPadded)))
  } catch {
    return null
  }
}

export function decodeAttribution(raw: string | null | undefined): DecodedAttribution | null {
  if (!raw) return null
  const json = base64UrlDecode(raw)
  if (!json) return null
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as DecodedAttribution
  } catch {
    return null
  }
}
