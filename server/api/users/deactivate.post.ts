import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { deactivateTenantUser, type LifecycleUser } from '~/server/utils/admin-lifecycle'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.db_user_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (!['admin', 'super_admin'].includes(authUser.role || '')) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
  }

  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, tenant_id, role, is_primary_admin, is_active, deleted_at')
    .eq('id', authUser.db_user_id)
    .maybeSingle()

  if (callerError || !caller || caller.is_active === false || caller.deleted_at) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
  }

  const body = await readBody(event)
  const userId = typeof body?.user_id === 'string' ? body.user_id : ''
  const reason = typeof body?.reason === 'string' ? body.reason : undefined

  const result = await deactivateTenantUser({
    supabase,
    caller: caller as LifecycleUser,
    targetUserId: userId,
    reason,
    authUserId: authUser.id,
    ipAddress: getClientIP(event),
  })

  return {
    success: result.success,
    message: 'User deactivated successfully',
  }
})
