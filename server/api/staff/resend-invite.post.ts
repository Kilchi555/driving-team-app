import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendEmail } from '~/server/utils/email'
import {
  buildStaffInviteEmailHtml,
  isPlaceholderStaffInviteEmail,
} from '~/server/utils/staff-invite-email'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getHeader(event, 'x-real-ip')
    || event.node.req.socket.remoteAddress
    || 'unknown'

  try {
    const body = await readBody(event)
    const invitationId = String(body?.invitationId || '').trim()
    const emailOverride = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!invitationId) {
      throw createError({ statusCode: 400, statusMessage: 'invitationId ist erforderlich' })
    }

    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const rateLimit = await checkRateLimit(user.id, 'staff_invite_resend', 10, 3600)
    if (!rateLimit.allowed) {
      const retryAfterSec = Math.max(1, Math.ceil((rateLimit.reset || 60000) / 1000))
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Versuche. Bitte warten Sie ${retryAfterSec} Sekunden.`,
      })
    }

    const supabase = getSupabaseAdmin()

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Kein Tenant gefunden' })
    }
    if (userProfile.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'Nur Admins können Einladungen erneut senden' })
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('id, tenant_id, first_name, last_name, phone, email, status, invitation_token, expires_at')
      .eq('id', invitationId)
      .eq('tenant_id', userProfile.tenant_id)
      .single()

    if (inviteError || !invitation) {
      throw createError({ statusCode: 404, statusMessage: 'Einladung nicht gefunden' })
    }
    if (!['pending', 'expired'].includes(invitation.status)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Diese Einladung kann nicht erneut gesendet werden',
      })
    }

    const { validateEmail } = await import('~/server/utils/validators')
    const {
      checkEmailAvailableForStaff,
      emailConflictMessage,
    } = await import('~/server/utils/email-availability')

    const hasRealEmail = invitation.email && !isPlaceholderStaffInviteEmail(invitation.email)
    let sendToEmail = hasRealEmail ? invitation.email!.toLowerCase().trim() : ''

    // Allow setting/updating email on resend (needed for old SMS-only invites)
    if (emailOverride) {
      if (!validateEmail(emailOverride).valid) {
        throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
      }
      sendToEmail = emailOverride
    }

    if (!sendToEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Keine Staff-E-Mail hinterlegt. Bitte E-Mail angeben oder neue Einladung erstellen.',
      })
    }

    const { data: adminRow } = await supabase
      .from('users')
      .select('email')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    // Reusing the same invite email is OK; only block if another user/auth/invite owns it
    if (!hasRealEmail || sendToEmail !== invitation.email?.toLowerCase().trim()) {
      const availability = await checkEmailAvailableForStaff({
        supabase,
        email: sendToEmail,
        adminEmail: adminRow?.email || null,
        tenantId: userProfile.tenant_id,
        ignoreInvitationId: invitation.id,
      })
      if (!availability.available) {
        const { getTerminologyDefaults } = await import('~/composables/useTerminology')
        const { data: tenantBt } = await supabase.from('tenants').select('business_type').eq('id', userProfile.tenant_id).single()
        const terms = getTerminologyDefaults(tenantBt?.business_type)
        throw createError({
          statusCode: 409,
          statusMessage: emailConflictMessage(availability, terms.staff || 'Mitarbeiter'),
        })
      }
    }

    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: updateError } = await supabase
      .from('staff_invitations')
      .update({
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        email: sendToEmail,
      })
      .eq('id', invitation.id)
      .eq('tenant_id', userProfile.tenant_id)

    if (updateError) {
      logger.error('❌ Failed to renew staff invitation:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Einladung konnte nicht erneuert werden' })
    }

    const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
    const forwardedHost = getHeader(event, 'x-forwarded-host')
    const host = forwardedHost || getHeader(event, 'host')
    const proto = getHeader(event, 'x-forwarded-proto') || 'https'
    let baseUrl: string
    if (envBase) {
      baseUrl = envBase
    } else if (host && !host.includes('localhost')) {
      baseUrl = `${proto}://${host}`
    } else {
      baseUrl = 'https://app.simy.ch'
    }

    const inviteLink = `${baseUrl}/register/staff?token=${token}`

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, slug, business_type, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
      .eq('id', userProfile.tenant_id)
      .single()

    const { getTerminologyDefaults } = await import('~/composables/useTerminology')
    const terms = getTerminologyDefaults(tenant?.business_type)
    const tenantName = tenant?.name || terms.businessNoun
    const loginLink = tenant?.slug ? `${baseUrl}/${tenant.slug}` : baseUrl
    const firstName = invitation.first_name || 'Hallo'
    const primaryColor = tenant?.primary_color || '#6000BD'
    const rawLogo = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo

    await logAudit({
      action: 'staff_invitation_resend',
      user_id: user.id,
      tenant_id: userProfile.tenant_id,
      resource_type: 'staff_invitation',
      resource_id: invitation.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_email: sendToEmail,
        invited_name: firstName,
        send_via: 'email',
        duration_ms: Date.now() - startTime,
      },
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    try {
      await sendEmail({
        to: sendToEmail,
        subject: `Einladung als ${terms.staff} – ${tenantName}`,
        html: buildStaffInviteEmailHtml({
          firstName,
          tenantName,
          inviteLink,
          staffLabel: terms.staff,
          loginUrl: loginLink,
          adminEmail: adminRow?.email || null,
          primaryColor,
          logoUrl,
        }),
        fromName: tenantName,
        fromEmail: tenant?.from_email,
        domainVerified: !!tenant?.resend_domain_verified,
      })

      return {
        success: true,
        sentVia: 'email',
        email: sendToEmail,
        inviteLink,
        message: 'Einladung per E-Mail erneut gesendet',
      }
    } catch (emailErr: any) {
      logger.warn('⚠️ Staff invite resend email failed:', emailErr?.message || emailErr)
      return {
        success: true,
        sentVia: 'email_failed',
        email: sendToEmail,
        inviteLink,
        message: 'Einladung erneuert, aber E-Mail konnte nicht gesendet werden. Link: ' + inviteLink,
      }
    }
  } catch (error: any) {
    if (error?.statusCode) throw error
    logger.error('Error in staff invitation resend:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error?.statusMessage || 'Interner Serverfehler',
    })
  }
})

function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
