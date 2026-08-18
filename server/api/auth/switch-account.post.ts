import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { validateUUID } from '~/server/utils/validators'
import {
  applySessionCookies,
  canReturnToAdmin,
  canSwitchToStaff,
  endImpersonation,
  isPrimaryTenantAdmin,
  isSwitchableStaff,
  isTenantAdmin,
  loadSwitchUser,
  loadSwitchUserByAuthId,
  mintSessionForUser,
  resolveGrantActor,
  startOrUpdateImpersonation,
  type SwitchUserRow,
} from '~/server/utils/account-switch'

function profilePayload(user: SwitchUserRow, extra: Record<string, unknown> = {}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    tenant_id: user.tenant_id,
    is_active: user.is_active,
    admin_level: user.admin_level ?? null,
    is_primary_admin: !!user.is_primary_admin,
    linked_admin_user_id: user.linked_admin_user_id ?? null,
    can_switch_all_staff: !!user.can_switch_all_staff,
    ...extra,
  }
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const current = await loadSwitchUserByAuthId(authUser.id)
  if (!current?.tenant_id || !current.is_active || current.deleted_at) {
    throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
  }
  if (current.role === 'super_admin') {
    throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
  }

  const ipAddress = getClientIP(event)
  const rate = await checkRateLimit(`user:${current.id}`, 'switch_account', 20, 60 * 60 * 1000)
  if (!rate.allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Zu viele Konto-Wechsel. Bitte später erneut versuchen.',
    })
  }

  const body = await readBody(event)
  const targetId = typeof body?.target_user_id === 'string' ? body.target_user_id.trim() : ''
  if (!validateUUID(targetId).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiges Zielkonto' })
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('slug, website_only')
    .eq('id', current.tenant_id)
    .maybeSingle()

  if (tenant?.website_only) {
    throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
  }

  const target = await loadSwitchUser(targetId)
  if (!target || target.tenant_id !== current.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
  }

  const userAgent = getHeader(event, 'user-agent') || ''
  let switchType: 'linked' | 'support' | 'staff_switch' = 'support'
  let goingToAdmin = false

  if (isTenantAdmin(target)) {
    if (!(await canReturnToAdmin(event, current, target))) {
      throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
    }
    goingToAdmin = true
  } else if (target.role === 'staff') {
    if (!(await canSwitchToStaff(event, current, target))) {
      throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
    }
    if (!isSwitchableStaff(target)) {
      throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
    }
    const grantActor = await resolveGrantActor(event, current)
    if (current.role === 'staff' && !isTenantAdmin(grantActor)) {
      switchType = current.linked_admin_user_id ? 'linked' : 'staff_switch'
    } else if (isPrimaryTenantAdmin(grantActor) && target.linked_admin_user_id === grantActor.id) {
      switchType = 'linked'
    } else {
      switchType = 'support'
    }
  } else {
    throw createError({ statusCode: 403, statusMessage: 'Wechsel nicht erlaubt' })
  }

  const session = await mintSessionForUser(target)
  applySessionCookies(event, session)

  if (goingToAdmin) {
    await endImpersonation(event, current.tenant_id)
  } else {
    const actor = await resolveGrantActor(event, current)
    // Impersonator cookie only for a real admin actor — never mint one for staff-to-staff.
    if (isTenantAdmin(actor) && actor.auth_user_id) {
      await startOrUpdateImpersonation({
        event,
        actor,
        target,
        switchType,
        ipAddress,
        userAgent,
      })
    }
  }

  await logAudit({
    action: 'switch_account',
    user_id: current.id,
    auth_user_id: authUser.id,
    tenant_id: current.tenant_id,
    resource_type: 'user',
    resource_id: target.id,
    status: 'success',
    ip_address: ipAddress,
    details: {
      from_user_id: current.id,
      from_role: current.role,
      to_user_id: target.id,
      to_role: target.role,
      switch_type: goingToAdmin ? 'return_admin' : switchType,
    },
  }, event)

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('slug, website_only, is_trial, trial_ends_at, subscription_plan, current_period_end')
    .eq('id', target.tenant_id)
    .maybeSingle()

  const redirectPath = goingToAdmin
    ? (tenantRow?.website_only ? '/admin/website' : '/admin')
    : '/dashboard'

  return {
    success: true,
    user: session.authUser,
    profile: profilePayload(target, {
      tenant_slug: tenantRow?.slug || null,
      website_only: !!tenantRow?.website_only,
      tenant: tenantRow || null,
      can_switch_accounts: true,
    }),
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      expires_at: session.expires_at,
    },
    redirectPath,
  }
})
