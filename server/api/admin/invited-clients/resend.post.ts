import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'
import {
  loadInvitationAdminCaller,
  renewPendingClientInvitation,
} from '~/server/utils/invited-user-manage'

const CLIENT_COLUMNS = 'id, tenant_id, role, first_name, last_name, email, onboarding_status, onboarding_token, onboarding_token_expires, auth_user_id'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const rateLimit = await checkRateLimit(authUser.id, 'client_invite_resend', 10, 3600 * 1000)
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.reset || 60000) / 1000))
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Versuche. Bitte warten Sie ${retryAfterSec} Sekunden.`,
      })
    }

    const supabase = getSupabaseAdmin()
    const caller = await loadInvitationAdminCaller(supabase, authUser.id)

    const renewed = await renewPendingClientInvitation({
      caller,
      userId: body?.userId,
      load: async (id, tenantId) => {
        const { data, error } = await supabase
          .from('users')
          .select(CLIENT_COLUMNS)
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (error) {
          logger.error('Failed to load invited client for resend:', error)
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
          logger.error('Failed to renew client invitation:', error)
          throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht erneuert werden' })
        }
        return !!data
      },
    })

    const onboardingLink = `https://app.simy.ch/onboarding/${renewed.token}`
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, primary_color, business_type, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
      .eq('id', caller.tenantId)
      .maybeSingle()

    const terms = await getTenantTerminology(supabase, caller.tenantId!)
    const tenantName = tenant?.name || `Ihre ${terms.businessNoun}`
    const primaryColor = tenant?.primary_color || '#2563eb'
    const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const loginLink = tenant?.slug
      ? `https://app.simy.ch/${tenant.slug}`
      : 'https://app.simy.ch/login'

    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
      || getHeader(event, 'x-real-ip')
      || 'unknown'

    await logAudit({
      action: 'client_invitation_resend',
      user_id: authUser.id,
      tenant_id: caller.tenantId,
      resource_type: 'user',
      resource_id: renewed.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_email: renewed.email,
        invited_role: 'client',
      },
    }).catch(err => logger.warn('Could not log client invitation resend:', err))

    try {
      await sendEmail({
        to: renewed.email,
        subject: `Registrierungserinnerung von ${tenantName}`,
        html: buildOnboardingEmailHtml({
          variant: 'reminder',
          tenantName,
          primaryColor,
          logoUrl,
          customerFirstName: renewed.first_name || terms.client,
          onboardingLink,
          loginLink,
          businessNoun: terms.businessNoun,
        }),
        fromName: tenantName,
        fromEmail: tenant?.from_email,
        domainVerified: !!tenant?.resend_domain_verified,
      })

      return {
        success: true,
        sentVia: 'email',
        email: renewed.email,
        message: 'Einladung per E-Mail erneut gesendet',
      }
    } catch (emailErr: any) {
      logger.warn('Client invite resend email failed:', emailErr?.message || emailErr)
      return {
        success: true,
        sentVia: 'email_failed',
        email: renewed.email,
        inviteLink: onboardingLink,
        message: 'Einladung erneuert, aber E-Mail konnte nicht gesendet werden.',
      }
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('Error resending client invitation:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.statusMessage || 'Interner Serverfehler',
    })
  }
})
