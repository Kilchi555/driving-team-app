// server/api/tenants/invite-staff-batch.post.ts
// Batch-Einladung von Mitarbeitern (staff) direkt im Onboarding-Flow.
// Kein JWT erforderlich – Tenant muss in den letzten 30 Minuten erstellt worden sein.
// Versand nur per E-Mail (kein SMS).
import { defineEventHandler, readBody, createError, getHeader } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { getPlanById } from '~/utils/planFeatures'
import { buildStaffInviteEmailHtml } from '~/server/utils/staff-invite-email'
import {
  checkEmailAvailableForStaff,
  emailConflictMessage,
} from '~/server/utils/email-availability'

interface StaffEntry {
  first_name: string
  last_name: string
  phone?: string
  email?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenant_id, staff_list } = body as {
    tenant_id: string
    staff_list: StaffEntry[]
  }

  if (!tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'tenant_id fehlt' })
  }
  if (!Array.isArray(staff_list) || staff_list.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'staff_list fehlt oder leer' })
  }
  if (staff_list.length > 20) {
    throw createError({ statusCode: 400, statusMessage: 'Maximal 20 Mitarbeiter pro Batch' })
  }

  const supabase = getSupabaseAdmin()

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, slug, created_at, business_type, primary_color, logo_wide_url, logo_url, logo_square_url, from_email, resend_domain_verified')
    .eq('id', tenant_id)
    .single()

  if (tenantError || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })
  }

  const { getTerminologyDefaults } = await import('~/composables/useTerminology')
  const terms = getTerminologyDefaults(tenant.business_type)
  const tenantName = tenant.name || terms.businessNoun
  const staffLabel = terms.staff
  const primaryColor = tenant.primary_color || '#6000BD'
  const rawLogo = tenant.logo_wide_url || tenant.logo_url || tenant.logo_square_url || null
  const logoUrl = rawLogo?.startsWith('data:') ? null : rawLogo

  const tenantAge = Date.now() - new Date(tenant.created_at).getTime()
  if (tenantAge > 30 * 60 * 1000) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Batch-Einladungen sind nur direkt nach der Registrierung möglich'
    })
  }

  const { data: tenantSub } = await supabase
    .from('tenants')
    .select('subscription_plan, addon_seats')
    .eq('id', tenant_id)
    .single()

  if (tenantSub) {
    const plan = tenantSub.subscription_plan || 'trial'
    const planDef = getPlanById(plan)
    const includedSeats = plan === 'trial' ? 3 : (planDef?.includedSeats ?? null)

    if (includedSeats !== null) {
      // Seats = staff only (admin is always included free)
      const totalAllowedSeats = includedSeats + (tenantSub.addon_seats || 0)
      const requestedCount = staff_list.length
      if (requestedCount > totalAllowedSeats) {
        throw createError({
          statusCode: 402,
          statusMessage: `Seat-Limit erreicht. Du kannst maximal ${totalAllowedSeats} Mitarbeiter einladen.`
        })
      }
    }
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('id, phone, email')
    .eq('tenant_id', tenant_id)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle()
  const invitedBy: string | null = adminUser?.id ?? null
  const adminEmail = adminUser?.email?.toLowerCase()?.trim() || null

  const envBase = process.env.NUXT_PUBLIC_BASE_URL || process.env.BASE_URL
  const host    = getHeader(event, 'x-forwarded-host') || getHeader(event, 'host')
  const proto   = getHeader(event, 'x-forwarded-proto') || 'https'
  const baseUrl = envBase || (host && !host.includes('localhost') ? `${proto}://${host}` : 'https://app.simy.ch')
  const loginUrl = tenant.slug ? `${baseUrl}/${tenant.slug}` : baseUrl

  const results: Array<{
    name: string
    status: 'email_sent' | 'invited' | 'failed'
    message: string
    invite_link?: string
  }> = []

  const { data: existingPendingInvites } = await supabase
    .from('staff_invitations')
    .select('id, phone, email')
    .eq('tenant_id', tenant_id)
    .eq('status', 'pending')

  const pendingPhoneSet = new Set(
    (existingPendingInvites || [])
      .map((inv) => normalizePhoneNumber(inv.phone || '') || '')
      .filter(Boolean)
  )
  const pendingEmailSet = new Set(
    (existingPendingInvites || [])
      .map((inv) => (inv.email || '').toLowerCase().trim())
      .filter(Boolean)
  )

  for (const entry of staff_list) {
    const firstName = sanitizeString(entry.first_name?.trim() || '', 100)
    const lastName  = sanitizeString(entry.last_name?.trim()  || '', 100)
    const rawPhone  = entry.phone?.trim() || null
    const phone     = rawPhone ? normalizePhoneNumber(rawPhone) : null
    const emailRaw  = entry.email?.trim().toLowerCase() || null
    const email     = emailRaw && validateEmail(emailRaw).valid ? emailRaw : null

    if (!firstName) {
      results.push({ name: firstName || '?', status: 'failed', message: 'Vorname erforderlich' })
      continue
    }
    if (!email) {
      results.push({
        name: `${firstName} ${lastName}`,
        status: 'failed',
        message: emailRaw ? 'Ungültige E-Mail' : 'E-Mail für Staff-Login erforderlich',
      })
      continue
    }

    if (adminEmail && email === adminEmail) {
      results.push({
        name: `${firstName} ${lastName}`,
        status: 'failed',
        message: emailConflictMessage({ available: false, reason: 'admin_login' }, staffLabel),
      })
      continue
    }

    if (pendingEmailSet.has(email)) {
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: 'Offene Einladung für diese E-Mail existiert bereits' })
      continue
    }

    if (phone && pendingPhoneSet.has(phone)) {
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: 'Offene Einladung für diese Telefonnummer existiert bereits' })
      continue
    }

    const availability = await checkEmailAvailableForStaff({
      supabase,
      email,
      adminEmail,
      tenantId: tenant_id,
    })
    if (!availability.available) {
      results.push({
        name: `${firstName} ${lastName}`,
        status: 'failed',
        message: emailConflictMessage(availability, staffLabel),
      })
      continue
    }

    const token = generateToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: insertError } = await supabase
      .from('staff_invitations')
      .insert({
        tenant_id,
        first_name: firstName,
        last_name:  lastName,
        email,
        phone,
        invitation_token: token,
        invited_by: invitedBy,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select('id')
      .single()

    if (insertError) {
      logger.warn('⚠️ invite-staff-batch: Einladung fehlgeschlagen für', firstName, lastName, insertError.message)
      results.push({ name: `${firstName} ${lastName}`, status: 'failed', message: insertError.message })
      continue
    }

    pendingEmailSet.add(email)
    if (phone) pendingPhoneSet.add(phone)

    const inviteLink = `${baseUrl}/register/staff?token=${token}`

    try {
      await sendEmail({
        to: email,
        subject: `Einladung als ${staffLabel} – ${tenantName}`,
        html: buildStaffInviteEmailHtml({
          firstName,
          tenantName,
          inviteLink,
          staffLabel,
          loginUrl,
          adminEmail,
          primaryColor,
          logoUrl,
        }),
        fromName: tenantName,
        fromEmail: tenant.from_email,
        domainVerified: !!tenant.resend_domain_verified,
      })
      results.push({ name: `${firstName} ${lastName}`, status: 'email_sent', message: 'E-Mail gesendet', invite_link: inviteLink })
      logger.debug('✅ Onboarding-E-Mail gesendet an:', email)
    } catch (emailErr: any) {
      logger.warn('⚠️ E-Mail fehlgeschlagen für', email, emailErr.message)
      results.push({
        name: `${firstName} ${lastName}`,
        status: 'invited',
        message: `E-Mail fehlgeschlagen. Link: ${inviteLink}`,
        invite_link: inviteLink,
      })
    }
  }

  logger.debug('✅ invite-staff-batch abgeschlossen:', results)
  return { success: true, results }
})

function generateToken(): string {
  const array = new Uint8Array(24)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
