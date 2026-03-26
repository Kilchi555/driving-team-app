import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * POST /api/auth/verify-affiliate-token
 *
 * Validates a one-time affiliate magic-link token and returns a Supabase
 * action_link. The frontend redirects to it — Supabase processes the magic link,
 * creates the session, and redirects back to /affiliate-dashboard with
 * #access_token=... in the URL hash (picked up automatically by the Supabase client).
 *
 * Body: { token: string }
 * Returns: { action_link: string }
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

  // Get user email for generateLink
  const { data: authUser } = await supabase.auth.admin.getUserById(userRow.auth_user_id)
  if (!authUser?.user?.email) {
    throw createError({ statusCode: 500, message: 'Fehler beim Erstellen der Sitzung.' })
  }

  // Mark token as used before issuing the Supabase magic link
  await supabase
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  // Generate a Supabase magic link — Supabase creates the session and redirects back
  // to /affiliate-dashboard with #access_token=... in the hash.
  // detectSessionInUrl: true on the client picks this up automatically.
  const appUrl = process.env.NUXT_PUBLIC_APP_URL ?? 'https://simy.ch'
  const { data: magicLinkData, error: magicError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: authUser.user.email,
    options: { redirectTo: `${appUrl}/affiliate-dashboard` },
  })

  if (magicError || !magicLinkData?.properties?.action_link) {
    throw createError({ statusCode: 500, message: 'Fehler beim Erstellen des Zugangs.' })
  }

  return {
    success: true,
    action_link: magicLinkData.properties.action_link,
  }
})
