// POST /api/push/register-token
// Saves (or refreshes) an FCM/APNs device token for the current user.
// Called by plugins/push.client.ts after Capacitor PushNotifications.register().

import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, 'authorization') ?? ''
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!accessToken) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
  }

  const { token, platform } = await readBody(event) as {
    token?: string
    platform?: string
  }

  if (!token || !platform) {
    throw createError({ statusCode: 400, statusMessage: 'token und platform sind erforderlich' })
  }
  if (!['ios', 'android', 'web'].includes(platform)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige Plattform' })
  }

  // Resolve user from the access token
  const supabaseUrl = process.env.SUPABASE_URL!
  const supabaseAnonKey = process.env.SUPABASE_KEY!
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data: { user }, error: authError } = await client.auth.getUser()

  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: 'Ungültiger Token' })
  }

  // Look up tenant_id for the user
  const admin = getSupabaseAdmin()
  const { data: userData } = await admin
    .from('users')
    .select('tenant_id')
    .eq('auth_user_id', user.id)
    .single()

  // Upsert: insert or update the token (keeps updated_at fresh)
  const { error } = await admin.from('push_tokens').upsert(
    {
      user_id: user.id,
      token,
      platform,
      tenant_id: userData?.tenant_id ?? null,
    },
    { onConflict: 'user_id,token' },
  )

  if (error) {
    console.error('[push/register-token] DB error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Fehler beim Speichern des Tokens' })
  }

  return { success: true }
})
