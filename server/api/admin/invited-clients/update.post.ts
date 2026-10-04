import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { evaluateClientEmailClaim } from '~/server/utils/auth-email-claim'
import {
  assertClientInviteEmailFree,
  assertInvitationAdmin,
  loadInvitationAdminCaller,
  updatePendingClientInvitation,
} from '~/server/utils/invited-user-manage'

const CLIENT_COLUMNS = 'id, tenant_id, role, first_name, last_name, email, onboarding_status, onboarding_token, onboarding_token_expires, auth_user_id'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const rateLimit = await checkRateLimit(authUser.id, 'client_invite_update', 30, 3600 * 1000)
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.reset || 60000) / 1000))
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Versuche. Bitte warten Sie ${retryAfterSec} Sekunden.`,
      })
    }

    const supabase = getSupabaseAdmin()
    const caller = await loadInvitationAdminCaller(supabase, authUser.id)
    const tenantId = assertInvitationAdmin(caller)

    const result = await updatePendingClientInvitation({
      caller,
      userId: body?.userId,
      firstName: body?.first_name,
      lastName: body?.last_name,
      email: body?.email,
      load: async (id, tenantId) => {
        const { data, error } = await supabase
          .from('users')
          .select(CLIENT_COLUMNS)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (error) {
          logger.error('Failed to load invited client:', error)
          throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht geladen werden' })
        }
        return data
      },
      save: async (id, tenantId, patch) => {
        const { data, error } = await supabase
          .from('users')
          .update(patch)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .eq('role', 'client')
          .eq('onboarding_status', 'pending')
          .is('auth_user_id', null)
          .select('id')
          .maybeSingle()
        if (error) {
          logger.error('Failed to update invited client:', error)
          throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht gespeichert werden' })
        }
        return !!data
      },
      ensureEmailAvailable: (email, userId) => ensureClientInviteEmailAvailable(supabase, email, caller.tenantId!, userId),
    })

    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
      || getHeader(event, 'x-real-ip')
      || 'unknown'

    await logAudit({
      action: 'client_invitation_updated',
      user_id: authUser.id,
      tenant_id: tenantId,
      resource_type: 'user',
      resource_id: result.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_email: result.email,
        email_changed: result.emailChanged,
        token_rotated: result.tokenRotated,
      },
    }).catch(err => logger.warn('Could not log client invitation update:', err))

    return {
      success: true,
      id: result.id,
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      onboarding_status: result.onboarding_status,
      role: result.role,
      emailChanged: result.emailChanged,
      tokenRotated: result.tokenRotated,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('Error updating invited client:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.statusMessage || 'Interner Serverfehler',
    })
  }
})

export async function ensureClientInviteEmailAvailable(
  supabase: { from: (table: string) => any },
  email: string,
  tenantId: string,
  excludeUserId: string,
): Promise<void> {
  const claim = await evaluateClientEmailClaim({
    supabase: supabase as any,
    email,
    tenantId,
    excludeUserId,
  })

  const { data: otherUser } = await supabase
    .from('users')
    .select('id')
    .eq('tenant_id', tenantId)
    .ilike('email', email)
    .neq('id', excludeUserId)
    .limit(1)
    .maybeSingle()

  const { data: pendingInvite } = await supabase
    .from('staff_invitations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .eq('email', email)
    .limit(1)
    .maybeSingle()

  assertClientInviteEmailFree({
    claim,
    otherUserInTenant: !!otherUser,
    pendingStaffInvite: !!pendingInvite,
  })
}
