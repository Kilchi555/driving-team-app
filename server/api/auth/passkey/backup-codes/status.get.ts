/**
 * GET /api/auth/passkey/backup-codes/status
 *
 * Returns the count of unused backup codes for the authenticated user.
 * Used by the UI to warn the user when their codes are running low.
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
  const { count } = await supabase
    .from('passkey_backup_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', dbUserId)
    .is('used_at', null)

  return { remainingCodes: count ?? 0 }
})
