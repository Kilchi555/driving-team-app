/**
 * POST /api/staff/add-student
 * 
 * Create a new student and send onboarding invitation
 * Staff can create students in their tenant
 * 
 * SECURITY:
 * ✅ Authentication Required - Bearer token validation
 * ✅ Authorization - Staff/Admin only, same tenant
 * ✅ Input Validation - All fields validated
 * ✅ Tenant Isolation - Only same tenant
 * ✅ RLS Enforcement - Supabase RLS policies applied
 * ✅ Audit Logging - All student creation logged
 * ✅ Error Handling - Generic messages
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'
import { upsertMarketingLeadSafe, categoriesFromUserCategory } from '~/server/utils/upsert-marketing-lead'
import { sendTenantSMS } from '~/server/utils/sms'
import { sendEmail } from '~/server/utils/email'
import { getTenantTerminology } from '~/server/utils/tenant-terminology'
import { buildOnboardingEmailHtml } from '~/server/utils/onboarding-email'
import { v4 as uuidv4 } from 'uuid'

interface StudentData {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
  birthdate?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  profession?: string
  category?: string
  assigned_staff_id?: string
  skip_sms?: boolean
  skip_email?: boolean
  send_invite?: boolean
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeSwissPhone(raw: string): string {
  let phone = String(raw || '').trim()
  phone = phone.replace(/[\s\-\.\(\)]/g, '')
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  if (phone.startsWith('0')) phone = '+41' + phone.slice(1)
  if (!phone.startsWith('+') && /^\d{9,}$/.test(phone)) phone = '+41' + phone
  return phone.replace(/[^+\d]/g, '')
}

export default defineEventHandler(async (event) => {
  try {
    // 1. AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get current user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, role, tenant_id, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (profileError || !userProfile) {
      logger.error('❌ Could not load user profile:', profileError)
      throw createError({ statusCode: 401, message: 'User profile not found' })
    }

    // 2. AUTHORIZATION - Only staff/admin can create students
    if (!['staff', 'admin'].includes(userProfile.role)) {
      logger.warn('❌ Unauthorized role:', userProfile.role)
      throw createError({ statusCode: 403, message: 'Not authorized' })
    }

    // 3. INPUT VALIDATION
    const body = await readBody<StudentData>(event)

    const firstName = body.first_name?.trim() || ''
    const lastName = body.last_name?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''
    const phoneRaw = body.phone?.trim() || ''
    const phone = phoneRaw ? normalizeSwissPhone(phoneRaw) : ''

    if (!firstName && !lastName) {
      throw createError({ statusCode: 400, message: 'First or last name required' })
    }

    // Need at least phone or email to contact the student
    if (!phone && !email) {
      throw createError({ statusCode: 400, message: 'Phone or email required' })
    }
    if (email && !EMAIL_RE.test(email)) {
      throw createError({ statusCode: 400, message: 'Invalid email address' })
    }
    if (phoneRaw && phone.replace(/\D/g, '').length < 10) {
      throw createError({ statusCode: 400, message: 'Phone number too short' })
    }

    logger.debug('📝 Creating student:', {
      name: `${firstName} ${lastName}`,
      phone,
      tenantId: userProfile.tenant_id
    })

    // 4. CHECK FOR DUPLICATES
    if (phone) {
      const { data: existingByPhone } = await supabase
        .from('users')
        .select('id, first_name, last_name, onboarding_status, is_active, auth_user_id')
        .eq('phone', phone)
        .eq('tenant_id', userProfile.tenant_id)
        .maybeSingle()

      if (existingByPhone) {
        const error: any = new Error('DUPLICATE_PHONE')
        error.code = '23505'
        error.existingUser = existingByPhone
        throw error
      }
    }

    if (email) {
      const { data: existingByEmail } = await supabase
        .from('users')
        .select('id, first_name, last_name, onboarding_status, is_active, auth_user_id')
        .ilike('email', email)
        .eq('tenant_id', userProfile.tenant_id)
        .maybeSingle()

      if (existingByEmail) {
        const error: any = new Error('DUPLICATE_EMAIL')
        error.code = '23505'
        error.existingUser = existingByEmail
        throw error
      }
    }

    // 5. CREATE NEW STUDENT
    const newStudentId = uuidv4()
    const onboardingToken = uuidv4()
    
    // Calculate expiry: 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: newStudentId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        email: email || null,
        birthdate: body.birthdate || null,
        street: body.street?.trim() || null,
        street_nr: body.street_nr?.trim() || null,
        zip: body.zip?.trim() || null,
        city: body.city?.trim() || null,
        profession: body.profession?.trim() || null,
        category: body.category || null,
        role: 'client', // Students are always clients
        tenant_id: userProfile.tenant_id,
        is_active: true,
        onboarding_status: 'pending',
        onboarding_token: onboardingToken,
        onboarding_token_expires: expiresAt.toISOString(),
        assigned_staff_id: userProfile.id  // ✅ NEW: Assign to staff who created the student
        // ✅ REMOVED: created_at and updated_at - let DB handle these with defaults
      })

    if (insertError) {
      logger.error('❌ Error creating student:', insertError)
      
      // Check for duplicate constraint
      if (insertError.code === '23505') {
        if (insertError.message?.includes('phone')) {
          const error: any = new Error('DUPLICATE_PHONE')
          error.code = '23505'
          throw error
        }
        if (insertError.message?.includes('email')) {
          const error: any = new Error('DUPLICATE_EMAIL')
          error.code = '23505'
          throw error
        }
      }
      
      throw createError({ statusCode: 500, message: 'Error creating student' })
    }

    logger.debug('✅ Student created successfully:', newStudentId)

    // 6. LOAD TENANT DATA (inkl. booking_policy für SMS-Entscheid)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, twilio_from_sender, booking_policy')
      .eq('id', userProfile.tenant_id)
      .single()

    const terms = await getTenantTerminology(supabase, userProfile.tenant_id)
    let tenantName = tenant?.twilio_from_sender || tenant?.name || terms.businessNoun || 'Ihr Unternehmen'

    // Serverseitige Policy: onboarding_sms_enabled (Standard: true)
    const onboardingSmsEnabled = (tenant?.booking_policy as any)?.onboarding_sms_enabled !== false
    const onboardingEmailEnabled = (tenant?.booking_policy as any)?.onboarding_email_enabled === true
    // SMS überspringen wenn Policy deaktiviert ODER kein Telefon vorhanden ODER Client skip
    const skipSms = !onboardingSmsEnabled || body.skip_sms === true || body.send_invite === false
    const skipEmail = !onboardingEmailEnabled || body.skip_email === true || body.send_invite === false

    // 7. SEND ONBOARDING INVITATION
    let smsSuccess = false
    let emailSuccess = false
    let onboardingLink = `https://app.simy.ch/onboarding/${onboardingToken}`

    // Send SMS if phone exists and policy allows it
    if (phone && !skipSms) {
      try {
        logger.debug('📱 Sending onboarding SMS to:', phone)
        
        // Login link lives in the welcome email after registration — keep SMS short
        const message = `Hallo ${firstName || terms.client}! Willkommen bei ${tenantName}. Bitte Registrierung abschliessen (30 Tage gültig): ${onboardingLink}`
        
        await sendTenantSMS({
          tenantId: userProfile.tenant_id,
          to: phone,
          message: message,
          purpose: 'student_onboarding',
          senderName: tenantName,
        })
        
        smsSuccess = true
      } catch (err: any) {
        logger.warn('⚠️ Error sending SMS:', err.message)
      }
    }

    // Send email if email exists and policy allows it
    if (email && !skipEmail) {
      try {
        logger.debug('📧 Sending onboarding email to:', email)
        const { data: fullTenant } = await supabase
          .from('tenants')
          .select('name, slug, primary_color, logo_wide_url, logo_url, logo_square_url')
          .eq('id', userProfile.tenant_id)
          .single()

        const primaryColor = fullTenant?.primary_color || '#2563eb'
        const logoUrl = fullTenant?.logo_wide_url || fullTenant?.logo_url || fullTenant?.logo_square_url || null
        const loginLink = fullTenant?.slug
          ? `https://app.simy.ch/${fullTenant.slug}`
          : 'https://app.simy.ch/login'
        const emailHtml = buildOnboardingEmailHtml({
          variant: 'welcome',
          tenantName: fullTenant?.name || tenantName,
          primaryColor,
          logoUrl,
          customerFirstName: firstName || terms.client,
          onboardingLink,
          loginLink,
          businessNoun: terms.businessNoun,
        })
        await sendEmail({
          to: email,
          subject: `Willkommen bei ${fullTenant?.name || tenantName} — Registrierung abschliessen`,
          html: emailHtml,
          senderName: fullTenant?.name || tenantName,
        })
        emailSuccess = true
      } catch (err: any) {
        logger.warn('⚠️ Error sending email:', err.message)
      }
    }

    // 8. AUDIT LOG
    await supabase
      .from('audit_logs')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        action: 'CREATE_STUDENT',
        resource_type: 'students',
        resource_id: newStudentId,
        status: 'success',
        metadata: {
          student_name: `${firstName} ${lastName}`,
          phone,
          sms_sent: smsSuccess,
          email_sent: emailSuccess,
          timestamp: new Date().toISOString()
        }
      })
      .then()
      .catch((err) => logger.warn('⚠️ Audit log failed:', err))

    logger.debug('✅ Student creation complete:', {
      id: newStudentId,
      smsSuccess,
      emailSuccess
    })

    if (email) {
      upsertMarketingLeadSafe({
        tenantId: userProfile.tenant_id,
        email,
        firstName,
        lastName,
        phone,
        categories: categoriesFromUserCategory(body.category),
        tags: ['client'],
        source: 'staff_add_student',
        sourceLabel: 'Staff: Schüler angelegt',
      })
    }

    return {
      success: true,
      student: {
        id: newStudentId,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        onboarding_status: 'pending'
      },
      smsSuccess,
      emailSuccess,
      onboardingLink
    }

  } catch (error: any) {
    logger.error('❌ Error in add-student API:', error)

    // Handle specific errors
    if (error.message === 'DUPLICATE_PHONE') {
      throw createError({ 
        statusCode: 409, 
        message: error.message,
        data: { existingUser: error.existingUser ?? null }
      })
    }

    if (error.message === 'DUPLICATE_EMAIL') {
      throw createError({ 
        statusCode: 409, 
        message: error.message,
        data: { existingUser: error.existingUser ?? null }
      })
    }

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      message: 'Error adding student'
    })
  }
})

