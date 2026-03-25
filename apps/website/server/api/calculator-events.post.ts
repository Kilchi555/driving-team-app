import { createClient } from '@supabase/supabase-js'

interface CalculatorEventPayload {
  event_type: 'opened' | 'submitted'
  category: string
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as CalculatorEventPayload

    if (!body.event_type || !body.category) {
      return { ok: false, error: 'Missing fields' }
    }

    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('Supabase not configured for calculator events')
      return { ok: true } // Don't fail the request
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error } = await supabase.from('calculator_events').insert({
      event_type: body.event_type,
      category: body.category,
      date: new Date().toISOString().split('T')[0],
    })

    if (error) {
      console.error('Failed to log calculator event:', error)
      return { ok: true } // Don't fail the request
    }

    return { ok: true }
  } catch (err: any) {
    console.error('Error in calculator-events:', err)
    return { ok: true } // Fire and forget
  }
})
