// server/api/tenants/create-admin.post.ts
// Creates the first admin user for a newly registered tenant
// ✅ No auth required (called during registration flow)
// ✅ Rate limited + registration token verification

import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { normalizePhoneNumber } from '~/server/utils/sms'
import { verifyRegistrationToken } from '~/server/utils/registration-token'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import {
  normalizeRegistrationEmail,
  tenantAllowsPrivilegedOnboarding,
  REGISTRATION_STATUS_ACTIVE,
} from '~/server/utils/registration-email-verification'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)

  // Rate limit: 5 admin creations per IP per hour (fail-closed)
  const rateLimit = await checkRateLimit(ipAddress, 'create_admin', 5, 3600 * 1000)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const body = await readBody(event)
  const { email, password, first_name, last_name, phone, tenant_id, registration_token } = body || {}

  if (!email || !password || !first_name || !last_name || !tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Pflichtfelder fehlen: email, password, first_name, last_name, tenant_id' })
  }

  // ✅ Verify the short-lived registration token issued AFTER email verification
  if (!verifyRegistrationToken(registration_token, tenant_id)) {
    await logAudit({
      action: 'tenant_create_admin',
      resource_type: 'tenant',
      resource_id: tenant_id,
      ip_address: ipAddress,
      status: 'failed',
      error_message: 'invalid_or_expired_registration_token',
      details: { failure_class: 'token_invalid' },
    }).catch(() => {})
    throw createError({ statusCode: 403, statusMessage: 'Ungültiger oder abgelaufener Registrierungstoken' })
  }

  if (!validateEmail(email).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  if (password.length < 12) {
    throw createError({ statusCode: 400, statusMessage: 'Passwort muss mindestens 12 Zeichen lang sein' })
  }

  const supabase = getSupabaseAdmin()

  // Verify tenant exists, email verified, and active for onboarding
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, is_active, working_days_template, email_verified_at, registration_status, contact_email')
    .eq('id', tenant_id)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })
  }

  if (!tenantAllowsPrivilegedOnboarding(tenant)) {
    await logAudit({
      action: 'tenant_create_admin',
      tenant_id,
      resource_type: 'tenant',
      resource_id: tenant_id,
      ip_address: ipAddress,
      status: 'failed',
      error_message: 'email_not_verified',
      details: { failure_class: 'email_not_verified' },
    }).catch(() => {})
    throw createError({
      statusCode: 403,
      statusMessage: 'Bitte zuerst die E-Mail-Adresse bestätigen.',
    })
  }

  // Admin email must match the verified contact email (prevents swapping mailbox post-verify)
  const adminEmail = normalizeRegistrationEmail(email)
  const contactEmail = normalizeRegistrationEmail(tenant.contact_email || '')
  if (contactEmail && adminEmail !== contactEmail) {
    await logAudit({
      action: 'tenant_create_admin',
      tenant_id,
      resource_type: 'tenant',
      resource_id: tenant_id,
      ip_address: ipAddress,
      status: 'failed',
      error_message: 'admin_email_mismatch',
      details: { failure_class: 'admin_email_mismatch' },
    }).catch(() => {})
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin-E-Mail muss der bestätigten Kontakt-E-Mail entsprechen.',
    })
  }

  // Check admin email doesn't already exist
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existingUser) {
    throw createError({ statusCode: 409, statusMessage: 'Diese E-Mail-Adresse ist bereits als Benutzer registriert.' })
  }

  const { count: primaryCount, error: primaryErr } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .eq('role', 'admin')
    .eq('is_primary_admin', true)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (primaryErr) {
    throw createError({ statusCode: 500, statusMessage: 'Hauptadministrator konnte nicht geprüft werden.' })
  }
  if ((primaryCount || 0) > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Für diesen Tenant existiert bereits ein Hauptadministrator.' })
  }

  // 1. Create Supabase Auth user.
  // Email ownership was already proven via registration verification — confirm now.
  // Do NOT confirm before that gate (prevents unverified public registrants).
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: sanitizeString(first_name, 100),
      last_name: sanitizeString(last_name, 100),
      role: 'admin',
      tenant_id,
    }
  })

  if (authError || !authData?.user) {
    console.error('❌ Admin auth creation failed:', authError)
    await logAudit({
      action: 'tenant_create_admin',
      tenant_id,
      resource_type: 'tenant',
      resource_id: tenant_id,
      ip_address: ipAddress,
      status: 'failed',
      error_message: authError?.message || 'auth_create_failed',
      details: { failure_class: 'auth_create_failed' },
    }).catch(() => {})
    if (authError?.code === 'email_exists' || (authError as any)?.status === 422) {
      throw createError({ statusCode: 409, statusMessage: 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwende eine andere Adresse oder logge dich ein.' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Admin-Konto konnte nicht erstellt werden. Bitte erneut versuchen.' })
  }

  // 2. Create users row
  const normalizedPhone = phone?.trim() ? normalizePhoneNumber(phone.trim()) : null
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id,
      email: adminEmail,
      first_name: sanitizeString(first_name, 100),
      last_name: sanitizeString(last_name, 100),
      phone: normalizedPhone,
      role: 'admin',
      is_active: true,
      is_primary_admin: true,
      accepted_terms_at: new Date().toISOString(),
    })
    .select('id, email, first_name, last_name, role')
    .single()

  if (userErr) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
    console.error('❌ Admin users row creation failed:', userErr)
    await logAudit({
      action: 'tenant_create_admin',
      tenant_id,
      resource_type: 'tenant',
      resource_id: tenant_id,
      ip_address: ipAddress,
      status: 'failed',
      error_message: userErr.message,
      details: { failure_class: 'users_row_failed' },
    }).catch(() => {})
    if (userErr.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Für diesen Tenant existiert bereits ein Hauptadministrator.' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Benutzerprofil konnte nicht erstellt werden. Bitte erneut versuchen.' })
  }

  await supabase
    .from('tenants')
    .update({
      registration_status: REGISTRATION_STATUS_ACTIVE,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenant_id)

  await logAudit({
    action: 'tenant_create_admin',
    tenant_id,
    resource_type: 'tenant',
    resource_id: tenant_id,
    ip_address: ipAddress,
    status: 'success',
    details: { user_id: userRow?.id },
  }).catch(() => {})

  console.log(`✅ Admin user created for tenant ${tenant_id}`)

  // Auto-create working hours from tenant's working_days_template
  if (userRow?.id) {
    try {
      const tpl = tenant.working_days_template as any
      let workingHoursRows: any[]

      if (tpl && Array.isArray(tpl.days) && tpl.days.length > 0) {
        workingHoursRows = tpl.days.map((day: number) => {
          const daySchedule = tpl.schedule?.[String(day)]
          return {
            staff_id: userRow.id,
            tenant_id,
            day_of_week: day,
            start_time: (daySchedule?.start ?? tpl.start_time ?? '07:00') + ':00',
            end_time:   (daySchedule?.end   ?? tpl.end_time   ?? '19:00') + ':00',
            is_active: true,
            timezone: 'Europe/Zurich',
          }
        })
      } else {
        // Fallback to standard hours if no template set
        workingHoursRows = [1, 2, 3, 4, 5, 6].map(day => ({
          staff_id: userRow.id,
          tenant_id,
          day_of_week: day,
          start_time: '07:00:00',
          end_time: day === 6 ? '16:00:00' : '19:00:00',
          is_active: true,
          timezone: 'Europe/Zurich',
        }))
      }

      const { error: whErr } = await supabase
        .from('staff_working_hours')
        .upsert(workingHoursRows, { onConflict: 'staff_id,day_of_week' })
      if (whErr) console.warn('⚠️ Working hours insert failed (non-critical):', whErr.message)
      else console.log('✅ Working hours created from template for admin:', userRow.id)
    } catch (whEx: any) {
      console.warn('⚠️ Working hours exception (non-critical):', whEx.message)
    }
  }

  return {
    success: true,
    user: userRow
  }
})
