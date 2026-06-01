import { defineEventHandler, readBody } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'
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
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as PhoneClickPayload

    if (!process.env.VERCEL_ENV) return { ok: true }

    const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
    if (!supabaseUrl || !supabaseServiceKey) return { ok: true }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
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

    return { ok: true }
  } catch (err) {
    console.error('phone-click error:', err)
    return { ok: true }
  }
})
