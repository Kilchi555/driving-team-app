/**
 * Marketing Attribution Persistence
 *
 * Receives the decoded marketing attribution (gclid, UTMs) from app.simy.ch
 * when a user lands on a booking page via drivingteam.ch redirect.
 * Upserts into marketing_attributions keyed by session_id.
 *
 * This endpoint is intentionally permissive (no auth) because:
 *   1. session_id is opaque and rate-limited
 *   2. Worst case an attacker spams junk rows — impacts no real users
 *   3. Service-role insert is the only DB-side privilege
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import {
  mergeAttributionFields,
  hasAnyAttribution,
  type AttributionFields,
} from '~/server/utils/marketing-attribution-merge'

interface AttributionPayload {
  session_id: string
  tenant_id?: string | null
  attribution: {
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
  } | null
}

function nullable(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = String(value).trim()
  return trimmed.length > 0 && trimmed.length <= 512 ? trimmed : null
}

export default defineEventHandler(async (event) => {
  // Only persist on Vercel deployments; local dev is fire-and-forget OK.
  if (!process.env.VERCEL_ENV) {
    return { ok: true, reason: 'local_dev_skipped' }
  }

  let body: AttributionPayload | null = null
  try {
    body = (await readBody(event)) as AttributionPayload
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid body' })
  }

  if (!body?.session_id || !body.attribution) {
    return { ok: false, reason: 'missing_fields' }
  }

  const sessionId = nullable(body.session_id)
  if (!sessionId) {
    return { ok: false, reason: 'invalid_session_id' }
  }

  const attr = body.attribution as AttributionFields
  if (!hasAnyAttribution(attr)) {
    return { ok: true, reason: 'no_attribution_data' }
  }

  const userAgent = getHeader(event, 'user-agent') || null
  const ipCountry = getHeader(event, 'x-vercel-ip-country') || null

  try {
    const supabase = getSupabaseAdmin()

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
        tenant_id: nullable(body.tenant_id) ?? null,
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
        user_agent: userAgent ? String(userAgent).slice(0, 512) : null,
        ip_country: ipCountry,
      }, { onConflict: 'session_id' })

    if (error) {
      logger.warn('marketing-attribution upsert error:', error.message)
      return { ok: false, reason: 'db_error' }
    }

    return { ok: true }
  } catch (err: any) {
    logger.error('marketing-attribution unexpected error:', err?.message ?? err)
    return { ok: false, reason: 'unexpected_error' }
  }
})
