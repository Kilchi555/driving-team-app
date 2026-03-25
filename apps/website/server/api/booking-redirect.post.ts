import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

interface BookingRedirectPayload {
  category: string
  session_id: string
  referrer_page: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as BookingRedirectPayload

    if (!body.session_id || !body.category) {
      return { ok: false, error: 'Missing fields' }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase not configured for booking redirect')
      return { ok: true }
    }

    // Only skip on local development (allow production & preview)
    if (!process.env.VERCEL_ENV) {
      return { ok: true }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Track booking redirect
    const { error } = await supabase.from('booking_redirects').insert({
      session_id: body.session_id,
      category: body.category,
      referrer_page: body.referrer_page,
      date: new Date().toISOString().split('T')[0],
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
