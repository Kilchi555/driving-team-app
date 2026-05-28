/**
 * GET /api/auth/passkey/credentials
 *
 * Returns the list of passkeys registered for the currently authenticated user.
 */

import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const dbUserId: string | undefined = authUser.db_user_id || authUser.profile?.id
  if (!dbUserId) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .select('id, device_name, device_type, backup_state, transports, created_at, last_used_at')
    .eq('user_id', dbUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load credentials' })
  }

  return {
    credentials: (data || []).map((c) => ({
      id: c.id,
      deviceName: c.device_name,
      deviceType: c.device_type, // 'singleDevice' | 'multiDevice'
      synced: c.backup_state,
      transports: c.transports,
      createdAt: c.created_at,
      lastUsedAt: c.last_used_at
    }))
  }
})
