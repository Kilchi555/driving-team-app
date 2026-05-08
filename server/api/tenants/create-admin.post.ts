// server/api/tenants/create-admin.post.ts
// Creates the first admin user for a newly registered tenant
// ✅ No auth required (called during registration flow)
// ✅ Rate limited + tenant_id verification

import { defineEventHandler, createError, getHeader, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateEmail } from '~/server/utils/validators'
import { normalizePhoneNumber } from '~/server/utils/sms'

export default defineEventHandler(async (event) => {
  const ipAddress =
    getHeader(event, 'x-forwarded-for')?.split(',')[0].trim() ||
    getHeader(event, 'x-real-ip') ||
    event.node.req.socket.remoteAddress ||
    'unknown'

  // Rate limit: 5 admin creations per IP per hour
  const rateLimit = await checkRateLimit(ipAddress, 'create_admin', 5, 3600)
  if (!rateLimit.allowed) {
    throw createError({ statusCode: 429, statusMessage: 'Zu viele Anfragen. Bitte warten.' })
  }

  const body = await readBody(event)
  const { email, password, first_name, last_name, phone, tenant_id } = body || {}

  if (!email || !password || !first_name || !last_name || !tenant_id) {
    throw createError({ statusCode: 400, statusMessage: 'Pflichtfelder fehlen: email, password, first_name, last_name, tenant_id' })
  }

  if (!validateEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültige E-Mail-Adresse' })
  }

  if (password.length < 12) {
    throw createError({ statusCode: 400, statusMessage: 'Passwort muss mindestens 12 Zeichen lang sein' })
  }

  const supabase = getSupabaseAdmin()

  // Verify tenant exists and is not yet initialized
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, name, is_active, working_days_template')
    .eq('id', tenant_id)
    .single()

  if (tenantErr || !tenant) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant nicht gefunden' })
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

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase().trim(),
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
    throw createError({ statusCode: 500, statusMessage: `Auth-Erstellung fehlgeschlagen: ${authError?.message || 'Unbekannter Fehler'}` })
  }

  // 2. Create users row
  const normalizedPhone = phone?.trim() ? normalizePhoneNumber(phone.trim()) : null
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id,
      email: email.toLowerCase().trim(),
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
    throw createError({ statusCode: 500, statusMessage: `Benutzerprofil konnte nicht erstellt werden: ${userErr.message}` })
  }

  console.log(`✅ Admin user created for tenant ${tenant_id}: ${email}`)

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
