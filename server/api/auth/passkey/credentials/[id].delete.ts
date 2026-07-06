/**
 * DELETE /api/auth/passkey/credentials/:id
 *
 * Soft-deletes a passkey (sets is_active=false). The user can only delete his own.
 */

import { defineEventHandler, createError, getRouterParam } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logPasskeyEvent, getRequestContext, isPasskeyEnabledForRole } from '~/server/utils/passkey'

export default defineEventHandler(async (event) => {
  const ctx = getRequestContext(event)
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const dbUserId: string | undefined = authUser.db_user_id || authUser.profile?.id
  const role: string | undefined = authUser.role || authUser.profile?.role
  if (!dbUserId) {
    throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
  }
  if (!isPasskeyEnabledForRole(role)) {
    throw createError({ statusCode: 403, statusMessage: 'Passkey not enabled for your role' })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('webauthn_credentials')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', dbUserId)
    .select('credential_id')
    .maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 404, statusMessage: 'Credential not found' })
  }

  await logPasskeyEvent({
    userId: dbUserId,
    credentialId: data.credential_id,
    eventType: 'credential_deleted',
    success: true,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent
  })

  return { success: true }
})
