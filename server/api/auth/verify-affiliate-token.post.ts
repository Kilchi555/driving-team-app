import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/auth/verify-affiliate-token
 *
 * Validates our custom one-time token, then generates a Supabase OTP via
 * admin.generateLink. Returns { email, otp } so the client can call
 * supabase.auth.verifyOtp() directly — no redirect hop, no hash race condition.
 *
 * Body: { token: string }
 * Returns: { email, otp }
 */
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)
  const { token } = body

  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, message: 'Token ist erforderlich.' })
  }

  const { data: tokenData, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError || !tokenData) {
    throw createError({ statusCode: 400, message: 'Ungültiger oder abgelaufener Link.' })
  }

  if (tokenData.used_at) {
    throw createError({ statusCode: 400, message: 'Dieser Link wurde bereits verwendet. Bitte fordere einen neuen an.' })
  }

  if (new Date() > new Date(tokenData.expires_at)) {
    throw createError({ statusCode: 400, message: 'Dieser Link ist abgelaufen. Bitte fordere einen neuen an.' })
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('id', tokenData.user_id)
    .single()

  if (!userRow?.auth_user_id) {
    throw createError({ statusCode: 400, message: 'Benutzer nicht gefunden.' })
  }

  const { data: authUser } = await supabase.auth.admin.getUserById(userRow.auth_user_id)
  if (!authUser?.user?.email) {
    throw createError({ statusCode: 500, message: 'Fehler beim Laden des Benutzers.' })
  }

  // Generate a Supabase magic link OTP — the client uses verifyOtp() to exchange
  // it for a session directly (no redirect, no hash race condition)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
  })

  if (linkError || !linkData?.properties?.email_otp) {
    throw createError({ statusCode: 500, message: `Fehler beim Erstellen des Zugangs: ${linkError?.message ?? 'unbekannt'}` })
  }

  // Mark our custom token as used only after Supabase OTP was successfully generated
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  return {
    success: true,
    email: authUser.user.email,
    otp: linkData.properties.email_otp,
  }
})
