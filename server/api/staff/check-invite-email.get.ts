import { defineEventHandler, getQuery, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateEmail } from '~/server/utils/validators'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '~/server/utils/email-availability'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'

/**
 * Authenticated staff-invite email probe for admins.
 * Public /api/tenants/check-availability must not expose Auth-only hits.
 */
export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const rateLimit = await checkRateLimit(user.id, 'staff_invite_email_check', 60, 60)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const { email: rawEmail } = getQuery(event) as { email?: string }
  const email = String(rawEmail || '').trim().toLowerCase()
  if (!validateEmail(email).valid) {
    return {
      email: {
        available: false,
        reason: 'invalid' as const,
        message: 'Ungültige E-Mail-Adresse',
      },
    }
  }

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!profile?.tenant_id || profile.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Staff-E-Mails prüfen' })
  }

  const { data: adminRow } = await supabase
    .from('users')
    .select('email')
    .eq('tenant_id', profile.tenant_id)
    .eq('role', 'admin')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const adminEmail = adminRow?.email?.toLowerCase()?.trim()
    || user.email?.toLowerCase()?.trim()
    || null

  const availability = await checkEmailAvailableForStaff({
    supabase,
    email,
    adminEmail,
    tenantId: profile.tenant_id,
  })

  const terms = await getTenantTerminology(supabase, profile.tenant_id)
  const staffLabel = terms.staff || 'Mitarbeiter'

  if (availability.available) {
    return { email: { available: true as const } }
  }

  const uiReason =
    availability.reason === 'admin_login' ? 'admin'
      : availability.reason === 'auth_exists' ? 'auth'
        : availability.reason === 'lookup_failed' ? 'lookup_failed'
          : availability.reason === 'pending_invite' ? 'pending_invite'
            : 'taken'

  return {
    email: {
      available: false as const,
      reason: uiReason,
      message: emailConflictMessage(availability, staffLabel),
    },
  }
})
