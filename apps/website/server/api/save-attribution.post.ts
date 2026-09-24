/**
 * First-Party Attribution Persistence (drivingteam.ch)
 *
 * Called immediately when a user lands on drivingteam.ch with UTM params or
 * ad click IDs (gclid, fbclid etc.) — before they ever click a booking link.
 *
 * This gives us server-side attribution data independent of Meta Pixel or
 * Google Ads conversion tags, and is the source of truth for:
 *   - How many Meta/Google Ad clicks actually reached the website
 *   - Which landing pages paid traffic hits
 *   - Cross-domain attribution to app.simy.ch bookings via session_id
 */

import { getRequestHost } from 'h3'
import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import {
  mergeAttributionFields,
  hasAnyAttribution,
  type AttributionFields,
} from '~/server/utils/marketing-attribution-merge'
import { runAttributionTouchAfterLegacy } from '~/server/utils/marketing-touch-class'
import { getWebsiteTenantId } from '~/server/utils/website-tenant'
import { persistWebsiteMarketingTouch } from '~/server/utils/marketing-touch-persist'

const BOT_PATTERNS = /bot|crawl|spider|slurp|prerender|headless|lighthouse|pagespeed|python-requests|curl\/|wget|axios|node-fetch/i

function nullable(v: string | null | undefined): string | null {
  if (!v) return null
  const t = String(v).trim()
  return t.length > 0 && t.length <= 512 ? t : null
}

export default defineEventHandler(async (event) => {
  if (!process.env.VERCEL_ENV) return { ok: true, reason: 'local_dev_skipped' }

  const ua = getHeader(event, 'user-agent') || ''
  if (!ua || BOT_PATTERNS.test(ua)) return { ok: false, reason: 'bot' }

  let body: any = null
  try {
    body = await readBody(event)
  } catch {
    return { ok: false, reason: 'invalid_body' }
  }

  const sessionId = nullable(body?.session_id)
  if (!sessionId) return { ok: false, reason: 'missing_session_id' }

  const attr = (body?.attribution || {}) as AttributionFields
  const hasLegacyAttribution = hasAnyAttribution(attr)

  const supabase = createWebsiteSupabaseClient(event)
  if (!supabase) return { ok: false, reason: 'missing_supabase_config' }
  const ipCountry = getHeader(event, 'x-vercel-ip-country') || null
  let legacyError: string | null = null

  if (hasLegacyAttribution) {
    const { data: existingRow } = await supabase
      .from('marketing_attributions')
      .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_page')
      .eq('session_id', sessionId)
      .maybeSingle()

    const merged = mergeAttributionFields(existingRow as AttributionFields | null, attr)

    const { error } = await supabase
      .from('marketing_attributions')
      .upsert({
        session_id: sessionId,
        tenant_id: nullable(body?.tenant_id) ?? null,
        gclid: nullable(merged.gclid),
        gbraid: nullable(merged.gbraid),
        wbraid: nullable(merged.wbraid),
        fbclid: nullable(merged.fbclid),
        fbc: nullable(merged.fbc),
        fbp: nullable(merged.fbp),
        utm_source: nullable(merged.utm_source),
        utm_medium: nullable(merged.utm_medium),
        utm_campaign: nullable(merged.utm_campaign),
        utm_content: nullable(merged.utm_content),
        utm_term: nullable(merged.utm_term),
        landing_page: nullable(merged.landing_page),
        user_agent: ua ? String(ua).slice(0, 512) : null,
        ip_country: ipCountry,
      }, { onConflict: 'session_id' })

    if (error) legacyError = error.message
  }

  const firstPartyHost = getRequestHost(event, { xForwardedHost: true })
  const outcome = await runAttributionTouchAfterLegacy({
    legacyError,
    onLegacyError: (message) => console.warn('[save-attribution] upsert error:', message),
    onTouchError: (touchErr: any) => {
      console.warn('[save-attribution] marketing touch capture failed:', touchErr?.message ?? touchErr)
    },
    writeTouch: async () => {
      const tenantId = await getWebsiteTenantId(event)
      if (!tenantId) return
      const referrer = nullable(body?.referrer_host) || nullable(attr && (attr as { referrer?: string }).referrer)
      await persistWebsiteMarketingTouch(supabase, {
        tenantId,
        sessionId,
        observation: {
          ...attr,
          landing_page: nullable(attr.landing_page),
          referrer,
          firstPartyHost,
        },
      })
    },
  })

  if (outcome.legacyFailed) return { ok: false, reason: 'db_error' }
  return { ok: true, reason: hasLegacyAttribution ? undefined : 'no_attribution_data' }
})
