import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { evaluateReactivation, type LifecycleUser } from '~/server/utils/admin-lifecycle'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.db_user_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const { data: caller, error: callerError } = await supabase
    .from('users')
    .select('id, tenant_id, role, is_primary_admin, is_active, deleted_at')
    .eq('id', authUser.db_user_id)
    .maybeSingle()

  if (callerError || !caller) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
  }

  const decision = evaluateReactivation(caller as LifecycleUser)
  if (!decision.ok) {
    throw createError({ statusCode: decision.statusCode, statusMessage: decision.statusMessage })
  }

  const body = await readBody(event)
  const userId = typeof body?.user_id === 'string' ? body.user_id : ''
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required field: user_id' })
  }

  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', userId)
    .maybeSingle()

  if (targetError || !targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (caller.role !== 'super_admin' && targetUser.tenant_id !== caller.tenant_id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Cannot reactivate user from different tenant',
    })
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({
      is_active: true,
      deleted_at: null,
      deletion_reason: null,
    })
    .eq('id', targetUser.id)
    .eq('tenant_id', targetUser.tenant_id)

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to reactivate user' })
  }

  await logAudit({
    user_id: caller.id,
    auth_user_id: authUser.id,
    action: 'user_reactivated',
    resource_type: 'user',
    resource_id: targetUser.id,
    status: 'success',
    tenant_id: targetUser.tenant_id || undefined,
    ip_address: getClientIP(event),
  })

  return {
    success: true,
    message: 'User reactivated successfully',
  }
})
