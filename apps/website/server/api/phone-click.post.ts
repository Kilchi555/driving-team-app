import { defineEventHandler, readBody } from 'h3'
import type { H3Event } from 'h3'
import { createWebsiteSupabaseClient } from '~/server/utils/supabase-service-env'
import { getWebsiteTenantId } from '~/server/utils/website-tenant'

interface PhoneClickPayload {
  session_id: string
  phone_number: string
  referrer_page: string
  utm_source?: string | null
  utm_medium?: string | null
  utm_campaign?: string | null
  utm_content?: string | null
  utm_term?: string | null
  /** Marketing attribution blob forwarded from window.__dtMarketingAttribution */
  marketing_attribution?: {
    gclid?: string | null
    gbraid?: string | null
    wbraid?: string | null
  } | null
}

/**
 * Upload a phone-click conversion to Google Ads via app.simy.ch internal endpoint.
 * Looks up the gclid from:
 *   1. marketing_attribution blob sent directly in the request (preferred)
 *   2. marketing_attributions DB row matching session_id (fallback)
 */
async function uploadPhoneClickConversion(
  event: H3Event,
  supabase: NonNullable<ReturnType<typeof createWebsiteSupabaseClient>>,
  sessionId: string,
  directAttribution: PhoneClickPayload['marketing_attribution'],
): Promise<void> {
  const cfg = useRuntimeConfig(event)
  const internalSecret = cfg.internalApiSecret as string
  const baseUrl = (cfg.simyApiBaseUrl as string) || 'https://app.simy.ch'
  if (!internalSecret) return

  // 1. Use attribution blob from the request (gclid already in memory from the click)
  let gclid = directAttribution?.gclid ?? null
  let gbraid = directAttribution?.gbraid ?? null
  let wbraid = directAttribution?.wbraid ?? null

  // 2. Fallback: look up session in marketing_attributions
  if (!gclid && !gbraid && !wbraid && sessionId && sessionId !== 'unknown') {
    const { data } = await supabase
      .from('marketing_attributions')
      .select('gclid, gbraid, wbraid')
      .eq('session_id', sessionId)
      .maybeSingle()

    gclid = data?.gclid ?? null
    gbraid = data?.gbraid ?? null
    wbraid = data?.wbraid ?? null
  }

  if (!gclid && !gbraid && !wbraid) return // no click ID — organic/direct visitor

  const syntheticId = `phone_${sessionId}_${Date.now()}`

  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/upload-inquiry-conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Api-Secret': internalSecret,
      },
      body: JSON.stringify({
        proposal_id: syntheticId,
        gclid,
        gbraid,
        wbraid,
      }),
    })
  } catch (err: any) {
    console.warn('⚠️ Phone-click conversion upload failed (non-critical):', err?.message ?? err)
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as PhoneClickPayload

    if (!process.env.VERCEL_ENV) return { ok: true }

    const supabase = createWebsiteSupabaseClient(event)
    if (!supabase) return { ok: true }
    const tenantId = await getWebsiteTenantId(event)

    // Reuse booking_redirects table with category 'phone_call' to keep schema minimal
    const { error } = await supabase.from('booking_redirects').insert({
      session_id: body.session_id || 'unknown',
      tenant_id: tenantId,
      category: 'phone_call',
      referrer_page: body.referrer_page || '/',
      date: new Date().toISOString().split('T')[0],
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
    })

    if (error) console.error('phone-click insert error:', error)

    // Upload Google Ads conversion if this click can be attributed to an ad (fire-and-forget)
    ;(async () => {
      await uploadPhoneClickConversion(event, supabase, body.session_id || 'unknown', body.marketing_attribution ?? null)
    })()

    return { ok: true }
  } catch (err) {
    console.error('phone-click error:', err)
    return { ok: true }
  }
})
