import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { getPlanById } from '~/utils/planFeatures'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import {
  buildStaffInviteEmailHtml,
  isFirstStaffOnboarding,
} from '~/server/utils/staff-invite-email'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '~/server/utils/email-availability'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  try {
    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim()
      || getHeader(event, 'x-real-ip')
      || event.node.req.socket.remoteAddress
      || 'unknown'

    const body = await readBody(event)
    const { firstName, phone, email: rawEmail } = body

    if (!firstName || !rawEmail) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Vorname und E-Mail sind erforderlich',
      })
    }

    const emailCandidate = String(rawEmail).trim().toLowerCase()
    if (!validateEmail(emailCandidate).valid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige E-Mail-Adresse',
      })
    }
    const staffEmail = emailCandidate

    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required',
      })
    }

    logger.debug('✅ User authenticated:', user.email, 'User ID:', user.id)

    const rateLimit = await checkRateLimit(user.id, 'staff_invite', 10, 3600)
    if (!rateLimit.allowed) {
      logger.warn('⚠️ Rate limit exceeded for staff invitation:', user.email)
      throw createError({
        statusCode: 429,
        statusMessage: `Zu viele Einladungen. Bitte warten Sie ${rateLimit.retryAfter} Sekunden.`,
      })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server configuration error',
      })
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: userProfile, error: profileError } = await serviceSupabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: `Kein Tenant gefunden für User: ${user.email}`,
      })
    }

    if (userProfile.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Nur Admins können Einladungen versenden',
      })
    }

    const { data: tenantSub } = await serviceSupabase
      .from('tenants')
      .select('subscription_plan, addon_seats, is_trial')
      .eq('id', userProfile.tenant_id)
      .single()

    if (tenantSub) {
      const plan = tenantSub.subscription_plan || 'trial'
      const planDef = getPlanById(plan)
      const includedSeats = plan === 'trial' ? 3 : (planDef?.includedSeats ?? null)

      if (includedSeats !== null) {
        const totalAllowedSeats = includedSeats + (tenantSub.addon_seats || 0)

        // Seats count staff only — 1 admin is always included free
        const { count: activeStaff } = await serviceSupabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .eq('role', 'staff')
          .eq('is_active', true)

        const { count: pendingInvites } = await serviceSupabase
          .from('staff_invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', userProfile.tenant_id)
          .eq('status', 'pending')

        const usedSeats = (activeStaff || 0) + (pendingInvites || 0)

        if (usedSeats >= totalAllowedSeats) {
          const terms = await getTenantTerminology(serviceSupabase, userProfile.tenant_id)
          const staffLabel = terms.staff || 'Mitarbeiter'
          throw createError({
            statusCode: 402,
            statusMessage: `Seat-Limit erreicht (${usedSeats}/${totalAllowedSeats}). Bitte buchen Sie einen zusätzlichen ${staffLabel}-Seat unter /upgrade.`,
          })
        }
      }
    }

    const sanitizedFirstName = sanitizeString(firstName, 100)
    const rawPhone = phone ? String(phone).trim() : ''
    const sanitizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) : null
    if (rawPhone && !sanitizedPhone) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Ungültige Telefonnummer. Bitte im Format +41… oder 07x… eingeben.',
      })
    }

    const { data: adminRow } = await serviceSupabase
      .from('users')
      .select('email')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const adminEmail = adminRow?.email?.toLowerCase()?.trim() || user.email?.toLowerCase()?.trim() || null

    const availability = await checkEmailAvailableForStaff({
      supabase: serviceSupabase,
      email: staffEmail,
      adminEmail,
      tenantId: userProfile.tenant_id,
    })
    if (!availability.available) {
      const terms = await getTenantTerminology(serviceSupabase, userProfile.tenant_id)
      throw createError({
        statusCode: availability.reason === 'pending_invite' || availability.reason === 'user_exists' || availability.reason === 'auth_exists' ? 409 : 400,
        statusMessage: emailConflictMessage(availability, terms.staff || 'Mitarbeiter'),
      })
    }

    if (sanitizedPhone) {
      const { data: pendingInvites } = await serviceSupabase
        .from('staff_invitations')
        .select('id, phone, status')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('status', 'pending')

      const existingInvite = (pendingInvites || []).find((inv) => {
        const invNorm = normalizePhoneNumber(inv.phone || '')
        return invNorm && invNorm === sanitizedPhone
      })

      if (existingInvite) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Für diese Telefonnummer existiert bereits eine offene Einladung. Bitte «E-Mail erneut» nutzen.',
        })
      }
    }

    const showDualLoginHint = await isFirstStaffOnboarding(serviceSupabase, userProfile.tenant_id)

    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: invitation, error: inviteError } = await serviceSupabase
      .from('staff_invitations')
      .insert({
        tenant_id: userProfile.tenant_id,
        first_name: sanitizedFirstName,
        last_name: '',
        email: staffEmail,
        phone: sanitizedPhone,
        invitation_token: token,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creating invitation:', inviteError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Fehler beim Erstellen der Einladung',
      })
    }

    await logAudit({
      action: 'staff_invitation_created',
      user_id: user.id,
      tenant_id: userProfile.tenant_id,
      resource_type: 'staff_invitation',
      resource_id: invitation.id,
      ip_address: ipAddress,
      status: 'success',
      details: {
        invited_phone: sanitizedPhone,
        invited_email: staffEmail,
        invited_name: sanitizedFirstName,
        send_via: 'email',
        expires_at: expiresAt.toISOString(),
        duration_ms: Date.now() - startTime,
      },
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

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

    const { data: tenant } = await serviceSupabase
      .from('tenants')
      .select('name, slug, business_type, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
      .eq('id', userProfile.tenant_id)
      .single()

    const terms = await getTenantTerminology(serviceSupabase, userProfile.tenant_id)
    const tenantName = tenant?.name || terms.businessNoun
    const loginLink = tenant?.slug ? `${baseUrl}/${tenant.slug}` : baseUrl
    const primaryColor = tenant?.primary_color || '#6000BD'
    const rawLogo = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
    const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo

    try {
      await sendEmail({
        to: staffEmail,
        subject: `Einladung als ${terms.staff} – ${tenantName}`,
        html: buildStaffInviteEmailHtml({
          firstName: sanitizedFirstName,
          tenantName,
          inviteLink,
          staffLabel: terms.staff,
          clientsLabel: terms.clientsPlural,
          loginUrl: loginLink,
          adminEmail,
          showDualLoginHint,
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
        phone: sanitizedPhone || undefined,
        email: staffEmail,
        inviteLink,
        message: 'Einladung per E-Mail gesendet',
      }
    } catch (emailErr: any) {
      logger.warn('⚠️ Staff invite email failed:', emailErr?.message || emailErr)
      return {
        success: true,
        sentVia: 'email_failed',
        phone: sanitizedPhone || undefined,
        email: staffEmail,
        inviteLink,
        message: 'Einladung erstellt, aber E-Mail konnte nicht gesendet werden. Link: ' + inviteLink,
      }
    }
  } catch (error: any) {
    console.error('Error in staff invitation:', error)

    const ipAddress = getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    await logAudit({
      action: 'staff_invitation_created',
      tenant_id: (error as any).tenant_id,
      resource_type: 'staff_invitation',
      ip_address: ipAddress,
      status: 'failed',
      error_message: error.statusMessage || error.message,
      details: {
        invited_email: (error as any).email,
        duration_ms: Date.now() - startTime,
      },
    }).catch(err => logger.warn('⚠️ Could not log audit:', err))

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Interner Serverfehler',
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
