// server/api/admin/add-student.post.ts
// Create a client as pending (no Auth/password). Optionally send onboarding SMS/email
// based on booking_policy + send_invite flag.

import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { upsertMarketingLeadSafe, categoriesFromUserCategory } from '~/server/utils/upsert-marketing-lead'
import { sendTenantSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function normalizeSwissPhone(raw: string): string {
  let phone = String(raw || '').trim()
  phone = phone.replace(/[\s\-\.\(\)]/g, '')
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  if (phone.startsWith('0')) phone = '+41' + phone.slice(1)
  if (!phone.startsWith('+') && /^\d{9,}$/.test(phone)) phone = '+41' + phone
  return phone.replace(/[^+\d]/g, '')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)
    const body = await readBody(event)
    logger.debug('📝 Add student request:', { email: body.email, phone: body.phone })

    const authUserData = await getAuthenticatedUser(event)
    if (!authUserData) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUserData.id)
      .single()

    if (profileError || !userProfile?.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'User has no tenant assigned' })
    }

    if (!['admin', 'staff', 'super_admin', 'superadmin'].includes(userProfile.role || '')) {
      throw createError({ statusCode: 403, statusMessage: 'Access denied: insufficient role' })
    }

    const tenantId = userProfile.tenant_id
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
    const phone = phoneRaw ? normalizeSwissPhone(phoneRaw) : ''
    const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : ''
    const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : ''

    if (!firstName && !lastName) {
      throw createError({ statusCode: 400, statusMessage: 'Vorname oder Nachname erforderlich' })
    }
    if (!email && !phone) {
      throw createError({ statusCode: 400, statusMessage: 'Telefon oder E-Mail erforderlich' })
    }
    if (email && !EMAIL_RE.test(email)) {
      throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
    }
    if (phoneRaw && phone.replace(/\D/g, '').length < 10) {
      throw createError({ statusCode: 400, statusMessage: 'Telefonnummer zu kurz' })
    }

    const rateLimitResult = await checkRateLimit(
      authUserData.id,
      'add_student',
      30,
      60 * 1000,
      email || undefined,
      tenantId,
    )
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too many requests. Please try again later.',
      })
    }

    if (phone) {
      const { data: existingPhone } = await supabaseAdmin
        .from('users')
        .select('id, email, auth_user_id, is_active, onboarding_status, first_name, last_name')
        .eq('tenant_id', tenantId)
        .eq('phone', phone)
        .maybeSingle()

      if (existingPhone) {
        throw createError({
          statusCode: 409,
          statusMessage: 'DUPLICATE_PHONE',
          data: { existingUser: existingPhone },
        })
      }
    }

    if (email) {
      const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id, phone, auth_user_id, is_active, onboarding_status, first_name, last_name')
        .eq('tenant_id', tenantId)
        .ilike('email', email)
        .maybeSingle()

      if (existingEmail) {
        throw createError({
          statusCode: 409,
          statusMessage: 'DUPLICATE_EMAIL',
          data: { existingUser: existingEmail },
        })
      }
    }

    let assignedStaffId: string | null = null
    if (typeof body.assigned_staff_id === 'string' && body.assigned_staff_id.trim()) {
      const staffId = body.assigned_staff_id.trim()
      const { data: staffUser } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', staffId)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .maybeSingle()
      if (!staffUser || !['staff', 'admin', 'sub_admin'].includes(staffUser.role || '')) {
        throw createError({ statusCode: 400, statusMessage: 'Ungültiger zugewiesener Mitarbeiter' })
      }
      assignedStaffId = staffUser.id
    }

    const userId = crypto.randomUUID()
    const onboardingToken = crypto.randomUUID()
    const tokenExpires = new Date()
    tokenExpires.setDate(tokenExpires.getDate() + 30)

    const categoryArray = body.category
      ? (Array.isArray(body.category) ? body.category : [body.category])
      : []

    const assignedStaffIds = assignedStaffId ? [assignedStaffId] : []

    const { error: insertError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        auth_user_id: null,
        tenant_id: tenantId,
        first_name: firstName,
        last_name: lastName,
        email: email || '',
        phone: phone || '',
        birthdate: body.birthdate || null,
        street: typeof body.street === 'string' ? body.street.trim() || null : null,
        street_nr: typeof body.street_nr === 'string' ? body.street_nr.trim() || null : null,
        zip: typeof body.zip === 'string' ? body.zip.trim() || null : null,
        city: typeof body.city === 'string' ? body.city.trim() || null : null,
        profession: typeof body.profession === 'string' ? body.profession.trim() || null : null,
        category: categoryArray,
        assigned_staff_id: assignedStaffId,
        assigned_staff_ids: assignedStaffIds,
        role: 'client',
        is_active: true,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpires.toISOString(),
      }])

    if (insertError) {
      logger.error('Add student - Insert error:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create student: ${insertError.message}`,
      })
    }

    logger.debug('✅ Student created with ID:', userId)

    if (email) {
      upsertMarketingLeadSafe({
        tenantId,
        email,
        firstName,
        lastName,
        phone,
        categories: categoriesFromUserCategory(categoryArray),
        tags: ['client'],
        source: 'admin_add_student',
        sourceLabel: 'Admin: Kunde angelegt',
      })
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, slug, primary_color, logo_wide_url, logo_url, logo_square_url, twilio_from_sender, booking_policy, business_type')
      .eq('id', tenantId)
      .single()

    const policy = (tenant?.booking_policy as Record<string, any>) || {}
    const onboardingSmsEnabled = policy.onboarding_sms_enabled !== false
    const onboardingEmailEnabled = policy.onboarding_email_enabled === true
    // Checkbox default true; send_invite=false skips all invites
    const wantInvite = body.send_invite !== false
    const onboardingLink = `https://app.simy.ch/onboarding/${onboardingToken}`

    let smsSuccess = false
    let emailSuccess = false

    const terms = await getTenantTerminology(supabaseAdmin, tenantId)
    const tenantName = tenant?.twilio_from_sender || tenant?.name || terms.businessNoun || 'Ihr Unternehmen'

    if (wantInvite && onboardingSmsEnabled && phone) {
      try {
        const message = `Hallo ${firstName || terms.client}! Willkommen bei ${tenantName}. Bitte Registrierung abschliessen (30 Tage gültig): ${onboardingLink}`
        await sendTenantSMS({
          tenantId,
          to: phone,
          message,
          purpose: 'student_onboarding',
          senderName: tenantName,
        })
        smsSuccess = true
      } catch (err: any) {
        logger.warn('⚠️ Onboarding SMS failed:', err?.message)
      }
    }

    if (wantInvite && onboardingEmailEnabled && email) {
      try {
        const primaryColor = tenant?.primary_color || '#2563eb'
        const logoUrl = tenant?.logo_wide_url || tenant?.logo_url || tenant?.logo_square_url || null
        const loginLink = tenant?.slug
          ? `https://app.simy.ch/${tenant.slug}`
          : 'https://app.simy.ch/login'
        const emailHtml = buildOnboardingEmailHtml({
          variant: 'welcome',
          tenantName: tenant?.name || tenantName,
          primaryColor,
          logoUrl,
          customerFirstName: firstName || terms.client,
          onboardingLink,
          loginLink,
          businessNoun: terms.businessNoun,
        })
        await sendEmail({
          to: email,
          subject: `Willkommen bei ${tenant?.name || tenantName} — Registrierung abschliessen`,
          html: emailHtml,
          senderName: tenant?.name || tenantName,
        })
        emailSuccess = true
      } catch (err: any) {
        logger.warn('⚠️ Onboarding email failed:', err?.message)
      }
    }

    return {
      success: true,
      data: {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        role: 'client',
        is_active: true,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: tokenExpires.toISOString(),
        onboardingLink,
      },
      smsSuccess,
      emailSuccess,
      inviteSent: smsSuccess || emailSuccess,
    }
  } catch (error: any) {
    logger.error('Add student API error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to add student',
    })
  }
})
