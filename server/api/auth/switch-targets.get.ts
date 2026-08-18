import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  buildSwitchTargets,
  loadSwitchUserByAuthId,
} from '~/server/utils/account-switch'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const current = await loadSwitchUserByAuthId(authUser.id)
  if (!current?.tenant_id || !current.is_active || current.deleted_at) {
    return { canSwitch: false, impersonating: false, admin: null, ownStaff: null, staff: [], currentUserId: current?.id || null }
  }

  const { data: tenant } = await getSupabaseAdmin()
    .from('tenants')
    .select('website_only')
    .eq('id', current.tenant_id)
    .maybeSingle()

  const targets = await buildSwitchTargets(event, current, !!tenant?.website_only)
  return {
    ...targets,
    currentUserId: current.id,
  }
})
