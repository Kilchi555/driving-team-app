import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { validateUUID } from '~/server/utils/validators'
import {
  assertCallerMayManageGrants,
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

  const actorId = String(getQuery(event).actor_user_id || '').trim()
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

  const supabase = getSupabaseAdmin()
  const { data: grants } = await supabase
    .from('account_switch_grants')
    .select('target_user_id')
    .eq('actor_user_id', actor.id)
    .eq('tenant_id', caller.tenant_id)

  const { data: staff } = await supabase
    .from('users')
    .select('id, first_name, last_name, is_active, auth_user_id')
    .eq('tenant_id', caller.tenant_id)
    .eq('role', 'staff')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('first_name', { ascending: true })

  return {
    actor: {
      id: actor.id,
      first_name: actor.first_name,
      last_name: actor.last_name,
      role: actor.role,
      admin_level: actor.admin_level,
      can_switch_all_staff: !!actor.can_switch_all_staff,
    },
    target_ids: (grants || []).map((g: any) => g.target_user_id),
    staff: (staff || []).filter((s: any) => s.id !== actor.id && s.auth_user_id),
  }
})
