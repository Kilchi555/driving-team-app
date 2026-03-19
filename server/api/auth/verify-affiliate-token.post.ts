import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/auth/verify-affiliate-token
 *
 * Validates a one-time affiliate magic-link token and returns a short-lived
 * Supabase session so the frontend can authenticate the user without a password.
 *
 * Body: { token: string }
 * Returns: { session: { access_token, refresh_token, ... } }
 */
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()
  const body = await readBody(event)
  const { token } = body

  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, message: 'Token ist erforderlich.' })
  }

  // Verify token
  const { data: tokenData, error: tokenError } = await supabase
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (tokenError || !tokenData) {
    throw createError({ statusCode: 400, message: 'Ungültiger oder abgelaufener Link.' })
  }

  if (tokenData.used_at) {
    throw createError({ statusCode: 400, message: 'Dieser Link wurde bereits verwendet.' })
  }

  if (new Date() > new Date(tokenData.expires_at)) {
    throw createError({ statusCode: 400, message: 'Dieser Link ist abgelaufen. Bitte fordere einen neuen an.' })
  }

  // Get auth_user_id
  const { data: userRow } = await supabase
    .from('users')
    .select('auth_user_id')
    .eq('id', tokenData.user_id)
    .single()

  if (!userRow?.auth_user_id) {
    throw createError({ statusCode: 400, message: 'Benutzer nicht gefunden.' })
  }

  // Generate a session via Supabase admin (no password needed)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: '', // overridden below
    options: { redirectTo: '/affiliate-dashboard' },
  })

  // Instead of generateLink (which needs email), we use a one-time OTP approach:
  // Get user email and generate a session directly via signInWithOtp-style or
  // use admin.createSession if available. Fall back to generating a temp password approach.
  const { data: authUser } = await supabase.auth.admin.getUserById(userRow.auth_user_id)
  if (!authUser?.user?.email) {
    throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Sitzung.' })
  }

  // Mark token as used immediately (idempotent protection)
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  // Return user info so frontend can sign in with a fresh OTP
  // Since we can't create a session server-side without the Supabase Admin Session API,
  // we return a signed-URL magic link that the client can exchange for a session.
  const { data: magicLinkData, error: magicError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
    options: { redirectTo: `${process.env.NUXT_PUBLIC_APP_URL ?? 'https://simy.ch'}/affiliate-dashboard` },
  })

  if (magicError || !magicLinkData?.properties?.hashed_token) {
    throw createError({ statusCode: 500, message: 'Fehler beim Erstellen des Zugangs.' })
  }

  return {
    success: true,
    // Return the action_link so frontend can exchange it via supabase.auth.verifyOtp
    action_link: magicLinkData.properties.action_link,
    email: authUser.user.email,
    hashed_token: magicLinkData.properties.hashed_token,
  }
})
