import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '~/server/utils/email-availability'
import {
  loadInvitationAdminCaller,
  updatePendingStaffInvitation,
} from '~/server/utils/invited-user-manage'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const rateLimit = await checkRateLimit(authUser.id, 'staff_invite_update', 30, 3600 * 1000)
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.reset || 60000) / 1000))
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Versuche. Bitte warten Sie ${retryAfterSec} Sekunden.`,
      })
    }

    const supabase = getSupabaseAdmin()
    const caller = await loadInvitationAdminCaller(supabase, authUser.id)

    const result = await updatePendingStaffInvitation({
      caller,
      invitationId: body?.invitationId,
      firstName: body?.first_name,
      lastName: body?.last_name,
      email: body?.email,
      load: async (id, tenantId) => {
        const { data, error } = await supabase
          .from('staff_invitations')
          .select('id, tenant_id, first_name, last_name, email, status, role, invitation_token, expires_at')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (error) {
          logger.error('Failed to load staff invitation for edit:', error)
          throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht geladen werden' })
        }
        return data
      },
      save: async (id, tenantId, patch) => {
        const { data, error } = await supabase
          .from('staff_invitations')
          .update(patch)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .in('status', ['pending', 'expired'])
          .select('id')
          .maybeSingle()
        if (error) {
          logger.error('Failed to update staff invitation:', error)
          throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht gespeichert werden' })
        }
        return !!data
      },
      ensureEmailAvailable: async (email, invitationId) => {
        const { data: adminRow } = await supabase
          .from('users')
          .select('email')
          .eq('tenant_id', caller.tenantId)
          .eq('role', 'admin')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle()

        const availability = await checkEmailAvailableForStaff({
          supabase,
          email,
          adminEmail: adminRow?.email || null,
          tenantId: caller.tenantId,
          ignoreInvitationId: invitationId,
        })
        if (!availability.available) {
          const { getTerminologyDefaults } = await import('~/composables/useTerminology')
          const { data: tenantBt } = await supabase
            .from('tenants')
            .select('business_type')
            .eq('id', caller.tenantId)
            .maybeSingle()
          const terms = getTerminologyDefaults(tenantBt?.business_type)
          const statusCode = availability.reason === 'lookup_failed'
            ? 503
            : availability.reason === 'invalid'
              ? 400
              : 409
          throw createError({
            statusCode,
            statusMessage: emailConflictMessage(availability, terms.staff || 'Mitarbeiter'),
          })
        }
      },
    })

    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
      || getHeader(event, 'x-real-ip')
      || 'unknown'

    await logAudit({
      action: 'staff_invitation_updated',
      user_id: authUser.id,
      tenant_id: caller.tenantId,
      resource_type: 'staff_invitation',
      resource_id: result.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_email: result.email,
        invited_role: result.role,
        email_changed: result.emailChanged,
        token_rotated: result.tokenRotated,
      },
    }).catch(err => logger.warn('Could not log staff invitation update:', err))

    return {
      success: true,
      id: result.id,
      first_name: result.first_name,
      last_name: result.last_name,
      email: result.email,
      status: result.status,
      role: result.role,
      emailChanged: result.emailChanged,
      tokenRotated: result.tokenRotated,
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('Error updating staff invitation:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.statusMessage || 'Interner Serverfehler',
    })
  }
})
