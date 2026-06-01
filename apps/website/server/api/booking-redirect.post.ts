import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'
import { getWebsiteTenantId } from '~/server/utils/website-tenant'

interface BookingRedirectPayload {
  category: string
  session_id: string
  referrer_page: string
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

    const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase not configured for booking redirect')
      return { ok: true }
    }

    // Only skip on local development (allow production & preview)
    if (!process.env.VERCEL_ENV) {
      return { ok: true }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const tenantId = await getWebsiteTenantId(event)

    // Track booking redirect
    const { error } = await supabase.from('booking_redirects').insert({
      session_id: body.session_id,
      tenant_id: tenantId,
      category: body.category,
      referrer_page: body.referrer_page,
      date: new Date().toISOString().split('T')[0],
      utm_source: body.utm_source || null,
      utm_medium: body.utm_medium || null,
      utm_campaign: body.utm_campaign || null,
      utm_content: body.utm_content || null,
      utm_term: body.utm_term || null,
    })

    if (error) {
      console.error('Failed to log booking redirect:', error)
      return { ok: true } // Don't fail the request
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Error in booking-redirect:', err)
    return { ok: true } // Fire and forget
  }
})
