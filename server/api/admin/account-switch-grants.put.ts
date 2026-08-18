import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { validateUUID } from '~/server/utils/validators'
import {
  assertCallerMayManageGrants,
  isPrimaryTenantAdmin,
  isSubAdmin,
  loadSwitchUser,
  loadSwitchUserByAuthId,
} from '~/server/utils/account-switch'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const caller = await loadSwitchUserByAuthId(authUser.id)
  if (!caller?.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  await assertCallerMayManageGrants(caller)

  const body = await readBody(event)
  const actorId = typeof body?.actor_user_id === 'string' ? body.actor_user_id.trim() : ''
  if (!validateUUID(actorId).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Benutzer' })
  }

  const actor = await loadSwitchUser(actorId)
  if (!actor || actor.tenant_id !== caller.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'Benutzer nicht gefunden' })
  }
  if (actor.role !== 'staff' && !isSubAdmin(actor)) {
    throw createError({ statusCode: 400, statusMessage: 'Freigaben nur für Staff oder Sub-Admin' })
  }
  if (isPrimaryTenantAdmin(actor)) {
    throw createError({ statusCode: 400, statusMessage: 'Hauptadmin braucht keine Freigaben' })
  }

  const canSwitchAll = body?.can_switch_all_staff === true
  const rawIds = Array.isArray(body?.target_ids) ? body.target_ids : []
  const targetIds = [...new Set(
    rawIds.filter((id: unknown) => typeof id === 'string' && validateUUID(id).valid && id !== actor.id),
  )] as string[]

  if (targetIds.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Zu viele Ziele' })
  }

  const supabase = getSupabaseAdmin()

  if (targetIds.length > 0) {
    const { data: targets, error } = await supabase
      .from('users')
      .select('id, role, tenant_id, is_active, auth_user_id, deleted_at')
      .in('id', targetIds)

    if (error) {
      throw createError({ statusCode: 500, statusMessage: 'Ziele konnten nicht geprüft werden' })
    }

    const valid = new Set(
      (targets || [])
        .filter((t: any) =>
          t.tenant_id === caller.tenant_id &&
          t.role === 'staff' &&
          t.is_active &&
          !t.deleted_at &&
          t.auth_user_id,
        )
        .map((t: any) => t.id),
    )

    if (valid.size !== targetIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültige Staff-Ziele' })
    }
  }

  await supabase
    .from('users')
    .update({ can_switch_all_staff: canSwitchAll })
    .eq('id', actor.id)
    .eq('tenant_id', caller.tenant_id)

  await supabase
    .from('account_switch_grants')
    .delete()
    .eq('actor_user_id', actor.id)
    .eq('tenant_id', caller.tenant_id)

  if (!canSwitchAll && targetIds.length > 0) {
    const rows = targetIds.map((target_user_id) => ({
      tenant_id: caller.tenant_id,
      actor_user_id: actor.id,
      target_user_id,
      created_by: caller.id,
    }))
    const { error: insertErr } = await supabase.from('account_switch_grants').insert(rows)
    if (insertErr) {
      throw createError({ statusCode: 500, statusMessage: 'Freigaben konnten nicht gespeichert werden' })
    }
  }

  await logAudit({
    action: 'update_account_switch_grants',
    user_id: caller.id,
    auth_user_id: authUser.id,
    tenant_id: caller.tenant_id,
    resource_type: 'user',
    resource_id: actor.id,
    status: 'success',
    ip_address: getClientIP(event),
    details: {
      actor_user_id: actor.id,
      can_switch_all_staff: canSwitchAll,
      target_count: canSwitchAll ? 'all' : targetIds.length,
    },
  }, event)

  return {
    success: true,
    can_switch_all_staff: canSwitchAll,
    target_ids: canSwitchAll ? [] : targetIds,
  }
})
