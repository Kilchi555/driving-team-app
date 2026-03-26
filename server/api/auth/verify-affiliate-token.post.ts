import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/auth/verify-affiliate-token
 *
 * Validates our custom one-time token, then sets a random temp password on the
 * auth user and returns { email, tempPassword } so the client can call
 * supabase.auth.signInWithPassword() — which always returns a full session
 * including a refresh_token (unlike generateLink + verifyOtp which may not).
 *
 * Body: { token: string }
 * Returns: { email, tempPassword }
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

  // Generate a strong random one-time password satisfying Supabase password policy
  // (requires lowercase, uppercase, and digits). UUID covers lowercase + digits;
  // we uppercase the first 8 chars to satisfy the uppercase requirement.
  // Result is 36 chars — well under bcrypt's 72-char limit.
  const uuid = crypto.randomUUID()
  const tempPassword = uuid.slice(0, 8).toUpperCase() + uuid.slice(8)

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userRow.auth_user_id,
    { password: tempPassword }
  )

  if (updateError) {
    throw createError({ statusCode: 500, message: `Fehler beim Erstellen des Zugangs: ${updateError.message}` })
  }

  // Mark our custom token as used only after temp password was set successfully
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  return {
    success: true,
    email: authUser.user.email,
    tempPassword,
  }
})
