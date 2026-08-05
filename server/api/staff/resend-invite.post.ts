import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { sendTenantSMS, normalizePhoneNumber } from '~/server/utils/sms'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
    || getHeader(event, 'x-real-ip')
    || event.node.req.socket.remoteAddress
    || 'unknown'

  try {
    const body = await readBody(event)
    const invitationId = String(body?.invitationId || '').trim()
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
      .select('id, tenant_id, first_name, last_name, phone, status, invitation_token, expires_at')
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
    if (!invitation.phone) {
      throw createError({ statusCode: 400, statusMessage: 'Einladung hat keine Telefonnummer' })
    }

    const normalizedPhone = normalizePhoneNumber(invitation.phone)
    if (!normalizedPhone) {
      throw createError({ statusCode: 400, statusMessage: `Ungültige Telefonnummer: ${invitation.phone}` })
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
        phone: normalizedPhone,
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
      .select('name, twilio_from_sender, slug, business_type')
      .eq('id', userProfile.tenant_id)
      .single()

    const { getTerminologyDefaults } = await import('~/composables/useTerminology')
    const terms = getTerminologyDefaults(tenant?.business_type)
    const tenantName = tenant?.name || terms.businessNoun
    const smsSenderName = tenant?.twilio_from_sender || tenantName
    const loginLink = tenant?.slug ? `${baseUrl}/${tenant.slug}` : baseUrl
    const firstName = invitation.first_name || 'Hallo'

    await logAudit({
      action: 'staff_invitation_resend',
      user_id: user.id,
      tenant_id: userProfile.tenant_id,
      resource_type: 'staff_invitation',
      resource_id: invitation.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_phone: normalizedPhone,
        invited_name: firstName,
        duration_ms: Date.now() - startTime,
      },
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    try {
      const smsMessage = `Hallo ${firstName}! Sie wurden als ${terms.staff} bei ${tenantName} eingeladen. Registrierung: ${inviteLink}\nLogin nach Registrierung: ${loginLink}`
      const smsResult = await sendTenantSMS({
        tenantId: userProfile.tenant_id,
        to: normalizedPhone,
        message: smsMessage,
        purpose: 'staff_invite',
        senderName: smsSenderName,
      })

      return {
        success: true,
        sentVia: 'sms',
        phone: normalizedPhone,
        inviteLink,
        smsId: smsResult?.messageSid,
        message: 'Einladung per SMS erneut gesendet',
      }
    } catch (smsError: any) {
      logger.warn('⚠️ Staff invite resend SMS failed:', smsError?.message || smsError)
      return {
        success: true,
        sentVia: 'sms_failed',
        phone: normalizedPhone,
        inviteLink,
        message: 'Einladung erneuert, aber SMS konnte nicht gesendet werden. Link: ' + inviteLink,
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
