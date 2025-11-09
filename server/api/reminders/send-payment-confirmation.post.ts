// ============================================
// Send Payment Confirmation Reminder
// ============================================
// Sendet die erste Erinnerungs-E-Mail nach Payment-Erstellung

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
      body
    })

    if (error) {
      console.error('❌ Error invoking send-payment-reminder function:', error)
      throw createError({
        statusCode: error.status ?? 500,
        message: error.message ?? 'Failed to send reminder'
      })
    }

    return data
  } catch (error: any) {
    console.error('❌ Error sending first reminder:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Failed to send reminder'
    })
  }
})

