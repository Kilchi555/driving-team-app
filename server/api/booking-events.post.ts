import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

interface BookingEventPayload {
  session_id: string
  event_type: 'viewed' | 'started' | 'completed' | 'abandoned'
  page: string
  referrer?: string
  course_id?: string
  amount?: number
  [key: string]: any
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as BookingEventPayload

    if (!body.session_id || !body.event_type) {
      return { ok: false }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return { ok: true } // Don't fail
    }

    // Only track in production
    if (process.env.VERCEL_ENV !== 'production') {
      return { ok: true }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert booking event
    const { error } = await supabase.from('booking_events').insert({
      session_id: body.session_id,
      event_type: body.event_type,
      page: body.page,
      referrer: body.referrer || null,
      course_id: body.course_id || null,
      amount: body.amount || null,
      date: new Date().toISOString().split('T')[0],
    })

    if (error) {
      console.error('Failed to log booking event:', error)
      return { ok: true }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Error in booking-events:', err)
    return { ok: true }
  }
})
