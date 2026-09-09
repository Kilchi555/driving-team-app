import { defineEventHandler, readBody } from 'h3'
import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import { getWebsiteTenantId } from '~/server/utils/website-tenant'
import { type AttributionFields } from '~/server/utils/marketing-attribution-merge'
import { resolveBookingRedirectClickIds } from '~/utils/booking-attribution-hop'

interface BookingRedirectPayload {
  category: string
  session_id: string
  referrer_page: string
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
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as BookingRedirectPayload

    if (!body.session_id || !body.category) {
      return { ok: false, error: 'Missing fields' }
    }

    const supabase = createWebsiteSupabaseClient(event)
    if (!supabase) {
      console.warn('Supabase not configured for booking redirect')
      return { ok: true }
    }

    // Only skip on local development (allow production & preview)
    if (!process.env.VERCEL_ENV) {
      return { ok: true }
    }
    const tenantId = await getWebsiteTenantId(event)

    let clickIds: AttributionFields = {
      gclid: body.gclid || null,
      gbraid: body.gbraid || null,
      wbraid: body.wbraid || null,
      fbclid: body.fbclid || null,
      fbc: body.fbc || null,
      fbp: body.fbp || null,
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
    }

    if (body.session_id && body.session_id !== 'unknown') {
      const { data: attrRow } = await supabase
        .from('marketing_attributions')
        .select('gclid, gbraid, wbraid, fbclid, fbc, fbp, utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .eq('session_id', body.session_id)
        .maybeSingle()
      if (attrRow) {
        clickIds = resolveBookingRedirectClickIds(clickIds, attrRow as AttributionFields)
      }
    }

    const { error } = await supabase.from('booking_redirects').insert({
      session_id: body.session_id,
      tenant_id: tenantId,
      category: body.category,
      referrer_page: body.referrer_page,
      date: new Date().toISOString().split('T')[0],
      gclid: clickIds.gclid || null,
      gbraid: clickIds.gbraid || null,
      wbraid: clickIds.wbraid || null,
      fbclid: clickIds.fbclid || null,
      fbc: clickIds.fbc || null,
      fbp: clickIds.fbp || null,
      utm_source: clickIds.utm_source || null,
      utm_medium: clickIds.utm_medium || null,
      utm_campaign: clickIds.utm_campaign || null,
      utm_content: clickIds.utm_content || null,
      utm_term: clickIds.utm_term || null,
    })

    if (error) {
      console.error('Failed to log booking redirect:', error)
      return { ok: true }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Error in booking-redirect:', err)
    return { ok: true }
  }
})
