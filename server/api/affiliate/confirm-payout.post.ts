import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getClientIP } from '~/server/utils/ip-utils'

/**
 * POST /api/affiliate/confirm-payout
 *
 * Validates the SMS OTP and promotes the payout request from
 * 'pending_sms' → 'pending' so it becomes visible for admin approval.
 *
 * Body: { payoutRequestId: string, otp: string }
 */
export default defineEventHandler(async (event) => {
  const supabaseAdmin = getSupabaseAdmin()
  const ipAddress = getClientIP(event)

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  // Rate-limit OTP attempts: max 5 per 15 minutes per IP
  const rateLimit = await checkRateLimit(ipAddress, 'confirm_payout_otp', 5, 15 * 60)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Versuche. Bitte warte kurz.' })
  }

  const { payoutRequestId, otp } = await readBody(event)

  if (!payoutRequestId || !otp) {
    throw createError({ statusCode: 400, message: 'payoutRequestId und otp sind erforderlich.' })
  }

  // Load the payout request — must belong to this user
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, message: 'User not found' })

  const { data: payoutRequest } = await supabaseAdmin
    .from('affiliate_payout_requests')
    .select('id, user_id, status, sms_otp, sms_otp_expires_at, amount_rappen, tenant_id')
    .eq('id', payoutRequestId)
    .eq('user_id', userProfile.id)
    .maybeSingle()

  if (!payoutRequest) {
    throw createError({ statusCode: 404, message: 'Auszahlungsantrag nicht gefunden.' })
  }

  if (payoutRequest.status !== 'pending_sms') {
    throw createError({ statusCode: 409, message: 'Dieser Antrag wurde bereits bestätigt oder ist ungültig.' })
  }

  if (!payoutRequest.sms_otp || payoutRequest.sms_otp !== String(otp).trim()) {
    throw createError({ statusCode: 400, message: 'Ungültiger Code. Bitte versuche es erneut.' })
  }

  if (!payoutRequest.sms_otp_expires_at || new Date() > new Date(payoutRequest.sms_otp_expires_at)) {
    // OTP expired — restore balance and delete request so user can try again
    await supabaseAdmin
      .from('student_credits')
      .rpc('increment_balance', {
        p_user_id: userProfile.id,
        p_tenant_id: payoutRequest.tenant_id,
        p_amount: payoutRequest.amount_rappen,
      })
      .catch(() => null)

    await supabaseAdmin
      .from('affiliate_payout_requests')
      .delete()
      .eq('id', payoutRequestId)

    throw createError({ statusCode: 400, message: 'Der Code ist abgelaufen. Bitte stelle einen neuen Auszahlungsantrag.' })
  }

  // Confirm: promote to 'pending' (now visible for admin) and clear OTP
  const { error: updateError } = await supabaseAdmin
    .from('affiliate_payout_requests')
    .update({
      status: 'pending',
      sms_otp: null,
      sms_otp_expires_at: null,
    })
    .eq('id', payoutRequestId)

  if (updateError) {
    throw createError({ statusCode: 500, message: 'Fehler beim Bestätigen des Antrags.' })
  }

  return {
    success: true,
    message: 'Auszahlungsantrag bestätigt! Du wirst benachrichtigt sobald die Überweisung durchgeführt wurde.',
  }
})
