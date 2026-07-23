/**
 * Direct-to-booking redirect bridge for the A/B test (July 2026): "does
 * skipping the drivingteam.ch landing page and going straight to the
 * app.simy.ch booking flow convert better for high-intent Google Ads clicks?"
 *
 * WHY THIS EXISTS instead of pointing the ad's Final URL straight at
 * app.simy.ch: Google Ads enforces "one website per ad group" — every ad in
 * an ad group must use the same domain as the other ads in that group. Since
 * the existing ad in "Fahrschule Altstetten"/"Fahrschule Schlieren" points to
 * drivingteam.ch, a second ad pointing to app.simy.ch gets DISAPPROVED
 * (policy topic ONE_WEBSITE_PER_AD_GROUP — confirmed 2026-07-23).
 *
 * This route keeps the ad's Final URL on drivingteam.ch (policy-compliant)
 * while functionally delivering the "skip the landing page" experience: it
 * captures gclid/UTMs, persists them to marketing_attributions using the
 * exact same pipeline that normal booking-link clicks use, and immediately
 * 302-redirects to the booking tool with a dt_attr blob — no landing page
 * render, no client-side JS round-trip needed.
 *
 * Ad Final URL should be:
 *   https://drivingteam.ch/go/buchen?category=B&utm_source=google&utm_medium=cpc
 *     &utm_campaign={campaignid}&utm_term={keyword}&utm_content={adgroupid}
 */

import { defineEventHandler, getQuery, getHeader, sendRedirect } from 'h3'
import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import { hasAnyAttribution, type AttributionFields } from '~/server/utils/marketing-attribution-merge'

const BOT_PATTERNS = /bot|crawl|spider|slurp|prerender|headless|lighthouse|pagespeed|python-requests|curl\/|wget|axios|node-fetch/i
const ALLOWED_CATEGORIES = new Set(['B', 'BE', 'A', 'A1', 'BPT', 'C', 'boot'])
const BOOKING_BASE_URL = 'https://app.simy.ch/booking/availability/driving-team'

function str(v: unknown): string | null {
  if (Array.isArray(v)) v = v[0]
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 && t.length <= 512 ? t : null
}

/** Node-native base64url encode — mirrors apps/website/utils/attribution-encode.ts for the browser. */
function encodeAttributionServer(attr: AttributionFields & { landing_page?: string | null }): string | null {
  const stripped: Record<string, string> = {}
  for (const [key, value] of Object.entries(attr)) {
    if (value) stripped[key] = String(value)
  }
  if (Object.keys(stripped).length === 0) return null
  return Buffer.from(JSON.stringify(stripped), 'utf-8').toString('base64url')
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const categoryRaw = str(query.category) ?? 'B'
  const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : 'B'

  const ua = getHeader(event, 'user-agent') || ''
  const isBot = !ua || BOT_PATTERNS.test(ua)

  const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

  const attribution: AttributionFields & { landing_page?: string | null } = {
    gclid: str(query.gclid),
    gbraid: str(query.gbraid),
    wbraid: str(query.wbraid),
    utm_source: str(query.utm_source) ?? 'google',
    utm_medium: str(query.utm_medium) ?? 'cpc',
    utm_campaign: str(query.utm_campaign),
    utm_content: str(query.utm_content),
    utm_term: str(query.utm_term),
    landing_page: '/go/buchen',
  }

  if (!isBot && hasAnyAttribution(attribution)) {
    const supabase = createWebsiteSupabaseClient(event)
    if (supabase) {
      const ipCountry = getHeader(event, 'x-vercel-ip-country') || null
      await supabase
        .from('marketing_attributions')
        .upsert({
          session_id: sessionId,
          gclid: attribution.gclid,
          gbraid: attribution.gbraid,
          wbraid: attribution.wbraid,
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_content: attribution.utm_content,
          utm_term: attribution.utm_term,
          landing_page: attribution.landing_page,
          user_agent: ua ? String(ua).slice(0, 512) : null,
          ip_country: ipCountry,
        }, { onConflict: 'session_id' })
        .then(({ error }) => {
          if (error) console.warn('[go/buchen] attribution upsert error:', error.message)
        })
        .catch(() => {})
    }
  }

  const dtAttr = encodeAttributionServer(attribution)
  const params = new URLSearchParams({ category, session_id: sessionId })
  if (dtAttr) params.set('dt_attr', dtAttr)

  return sendRedirect(event, `${BOOKING_BASE_URL}?${params.toString()}`, 302)
})
