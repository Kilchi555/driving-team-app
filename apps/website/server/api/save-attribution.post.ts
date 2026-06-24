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

import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

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

  const attr = body?.attribution
  if (!attr) return { ok: false, reason: 'missing_attribution' }

  // Only persist if there's actual ad/utm data — skip pure organic visits
  const hasAny = !!(attr.gclid || attr.gbraid || attr.wbraid || attr.fbclid || attr.utm_source || attr.utm_medium || attr.utm_campaign)
  if (!hasAny) return { ok: true, reason: 'no_attribution_data' }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  if (!supabaseUrl || !supabaseServiceKey) return { ok: false, reason: 'missing_supabase_config' }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const ipCountry = getHeader(event, 'x-vercel-ip-country') || null

  const { error } = await supabase
    .from('marketing_attributions')
    .upsert({
      session_id: sessionId,
      tenant_id: nullable(body?.tenant_id) ?? null,
      gclid: nullable(attr.gclid),
      gbraid: nullable(attr.gbraid),
      wbraid: nullable(attr.wbraid),
      fbclid: nullable(attr.fbclid),
      fbc: nullable(attr.fbc),
      fbp: nullable(attr.fbp),
      utm_source: nullable(attr.utm_source),
      utm_medium: nullable(attr.utm_medium),
      utm_campaign: nullable(attr.utm_campaign),
      utm_content: nullable(attr.utm_content),
      utm_term: nullable(attr.utm_term),
      landing_page: nullable(attr.landing_page),
      user_agent: ua ? String(ua).slice(0, 512) : null,
      ip_country: ipCountry,
    }, { onConflict: 'session_id' })

  if (error) {
    console.warn('[save-attribution] upsert error:', error.message)
    return { ok: false, reason: 'db_error' }
  }

  return { ok: true }
})
