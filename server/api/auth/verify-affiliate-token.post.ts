import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/auth/verify-affiliate-token
 *
 * Validates a one-time affiliate magic-link token and creates a persistent
 * Supabase session directly via admin.createSession (no redirect hop needed).
 *
 * Body: { token: string }
 * Returns: { access_token, refresh_token } — frontend calls supabase.auth.setSession()
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

  // Mark token as used immediately
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  // Create a Supabase session directly — no extra redirect hop needed.
  // The session duration follows the project's refresh token expiry setting.
  const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession({
    user_id: userRow.auth_user_id,
  })

  if (sessionError || !sessionData?.session) {
    throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Sitzung.' })
  }

  return {
    success: true,
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  }
})
