// POST /api/push/register-token
// Saves (or refreshes) an FCM/APNs device token for the current user.
// Called by plugins/push.client.ts after Capacitor PushNotifications.register().

import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthUserFromRequest(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
  }

  const { token: rawToken, platform } = await readBody(event) as {
    token?: string
    platform?: string
  }

  const token = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (!token || !platform) {
    throw createError({ statusCode: 400, statusMessage: 'token und platform sind erforderlich' })
  }
  if (token.length > 4096) {
    throw createError({ statusCode: 400, statusMessage: 'token zu lang' })
  }
  if (!['ios', 'android', 'web'].includes(platform)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Plattform' })
  }

  // Map auth.users.id → public.users.id (sendPushToUser keys off app user id)
  const admin = getSupabaseAdmin()
  const { data: userData, error: userLookupError } = await admin
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle()

  if (userLookupError) {
    console.error('[push/register-token] User lookup error:', userLookupError.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden des Users' })
  }
  if (!userData?.id) {
    throw createError({ statusCode: 404, statusMessage: 'Kein App-User für diese Session gefunden' })
  }

  // Upsert: insert or update the token (keeps updated_at fresh)
  const { error } = await admin.from('push_tokens').upsert(
    {
      user_id: userData.id,
      token,
      platform,
      tenant_id: userData.tenant_id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )

  if (error) {
    console.error('[push/register-token] DB error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern des Tokens' })
  }

  return { success: true }
})
