/**
 * Shared utility to encode/decode the marketing attribution blob that travels
 * with booking links from drivingteam.ch to app.simy.ch.
 *
 * The blob is base64url-encoded JSON so it survives URL-encoding without
 * special characters and stays under typical 2KB URL limits.
 */

import type { MarketingAttribution } from '~/plugins/marketing-attribution.client'

export type AttributionBlob = Pick<
  MarketingAttribution,
  'gclid' | 'gbraid' | 'wbraid' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_content' | 'utm_term' | 'landing_page'
>

function base64UrlEncode(input: string): string {
  // btoa works on Latin1 — use encodeURIComponent to safely handle UTF-8.
  const b64 = btoa(unescape(encodeURIComponent(input)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function encodeAttribution(attribution: MarketingAttribution | null | undefined): string | null {
  if (!attribution) return null

  const compact: AttributionBlob = {
    gclid: attribution.gclid || null,
    gbraid: attribution.gbraid || null,
    wbraid: attribution.wbraid || null,
    utm_source: attribution.utm_source || null,
    utm_medium: attribution.utm_medium || null,
    utm_campaign: attribution.utm_campaign || null,
    utm_content: attribution.utm_content || null,
    utm_term: attribution.utm_term || null,
    landing_page: attribution.landing_page || null,
  }

  const hasAny = Object.values(compact).some(v => v !== null && v !== '')
  if (!hasAny) return null

  // Drop null entries to keep the blob small.
  const stripped: Record<string, string> = {}
  for (const [key, value] of Object.entries(compact)) {
    if (value) stripped[key] = value
  }

  return base64UrlEncode(JSON.stringify(stripped))
}
