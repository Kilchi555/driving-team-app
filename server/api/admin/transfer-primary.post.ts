import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { validateUUID } from '~/server/utils/validators'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

/**
 * Moves the single active primary flag.
 * The client may send only target_user_id. Both flag writes happen in SQL.
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.db_user_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const targetUserId = typeof body?.target_user_id === 'string' ? body.target_user_id.trim() : ''
  if (!validateUUID(targetUserId).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Benutzer' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase.rpc('transfer_primary_admin', {
    p_caller_user_id: authUser.db_user_id,
    p_target_user_id: targetUserId,
  })

  if (error) {
    const message = error.message || ''
    if (message.includes('caller is not an active primary')) {
      throw createError({ statusCode: 403, statusMessage: 'Nur der Hauptadministrator kann die Rolle übertragen' })
    }
    if (message.includes('same tenant') || message.includes('target is not an active')) {
      throw createError({ statusCode: 403, statusMessage: 'Ziel ist kein aktiver Administrator mit Login im selben Tenant' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Hauptadministrator konnte nicht übertragen werden' })
  }

  await logAudit({
    user_id: authUser.db_user_id,
    auth_user_id: authUser.id,
    action: 'primary_admin_transferred',
    resource_type: 'user',
    resource_id: targetUserId,
    status: 'success',
    tenant_id: authUser.tenant_id || undefined,
    ip_address: getClientIP(event),
    details: { target_user_id: targetUserId },
  })

  return { success: true }
})
