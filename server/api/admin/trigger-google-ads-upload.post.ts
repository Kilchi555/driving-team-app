/**
 * Diagnostic: manually trigger the server-side Google Ads conversion upload for
 * a specific appointment. Used to verify Stage 4 end-to-end without waiting
 * for a fresh smoke booking.
 *
 * USAGE:
 *   curl -X POST https://app.simy.ch/api/admin/trigger-google-ads-upload \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"appointment_id": "c10b7448-fa8a-4290-9e77-5617c318c6fb"}'
 */

import { defineEventHandler, readBody, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { recordAndUploadConversion, sha256Hex } from '~/server/utils/google-ads-conversion'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event) as { appointment_id?: string }
  if (!body?.appointment_id) {
    return { success: false, reason: 'missing_appointment_id' }
  }

  const supabase = getSupabaseAdmin()
  const { data: appt, error } = await supabase
    .from('appointments')
    .select('id, gclid, gbraid, wbraid, original_price_rappen, user_id, created_at')
    .eq('id', body.appointment_id)
    .single()

  if (error || !appt) {
    return { success: false, reason: 'appointment_not_found', detail: error?.message }
  }

  if (!appt.gclid && !appt.gbraid && !appt.wbraid) {
    return { success: false, reason: 'no_click_id_on_appointment' }
  }

  const { data: user } = await supabase
    .from('users')
    .select('email, phone')
    .eq('id', appt.user_id)
    .maybeSingle()

  const normalizedEmail = (user?.email ?? '').trim().toLowerCase()
  const normalizedPhone = (user?.phone ?? '').replace(/\s+/g, '').replace(/^00/, '+')
  const hashedEmail = normalizedEmail ? await sha256Hex(normalizedEmail) : null
  const hashedPhone = normalizedPhone.startsWith('+') ? await sha256Hex(normalizedPhone) : null

  const conversionValueChf = (appt.original_price_rappen ?? 0) / 100

  await recordAndUploadConversion({
    appointment_id: appt.id,
    gclid: appt.gclid ?? null,
    gbraid: appt.gbraid ?? null,
    wbraid: appt.wbraid ?? null,
    conversion_value_chf: conversionValueChf,
    conversion_date_time: appt.created_at,
    hashed_email: hashedEmail,
    hashed_phone: hashedPhone,
  })

  // Read back the upload row so caller can see the outcome
  const { data: uploads } = await supabase
    .from('google_ads_conversion_uploads')
    .select('*')
    .eq('appointment_id', appt.id)
    .order('created_at', { ascending: false })
    .limit(1)

  return {
    success: true,
    appointment_id: appt.id,
    upload: uploads?.[0] ?? null,
  }
})
