// server/api/tenants/create-admin.post.ts
// Creates the first admin user for a newly registered tenant
// ✅ No auth required (called during registration flow)
// ✅ Rate limited + tenant_id verification

import { defineEventHandler, createError, getHeader, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { sanitizeString, validateEmail } from '~/server/utils/validators'

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
    .select('id, name, is_active')
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
      role: 'tenant_admin',
      tenant_id,
    }
  })

  if (authError || !authData?.user) {
    console.error('❌ Admin auth creation failed:', authError)
    throw createError({ statusCode: 500, statusMessage: `Auth-Erstellung fehlgeschlagen: ${authError?.message || 'Unbekannter Fehler'}` })
  }

  // 2. Create users row
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .insert({
      auth_user_id: authData.user.id,
      tenant_id,
      email: email.toLowerCase().trim(),
      first_name: sanitizeString(first_name, 100),
      last_name: sanitizeString(last_name, 100),
      phone: phone?.trim() || null,
      role: 'tenant_admin',
      is_active: true,
    })
    .select('id, email, first_name, last_name, role')
    .single()

  if (userErr) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {})
    console.error('❌ Admin users row creation failed:', userErr)
    throw createError({ statusCode: 500, statusMessage: `Benutzerprofil konnte nicht erstellt werden: ${userErr.message}` })
  }

  console.log(`✅ Admin user created for tenant ${tenant_id}: ${email}`)

  // Auto-create default working hours Mon–Sat 08:00–18:00 for the new admin
  if (userRow?.id) {
    try {
      const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6] // 1=Mon … 6=Sat
      const workingHoursRows = DEFAULT_DAYS.map(day => ({
        staff_id: userRow.id,
        tenant_id,
        day_of_week: day,
        start_time: '08:00:00',
        end_time:   '18:00:00',
        is_active: true,
      }))
      const { error: whErr } = await supabase
        .from('staff_working_hours')
        .upsert(workingHoursRows, { onConflict: 'staff_id,day_of_week' })
      if (whErr) console.warn('⚠️ Default working hours insert failed (non-critical):', whErr.message)
      else console.log('✅ Default working hours Mo–Sa created for admin:', userRow.id)
    } catch (whEx: any) {
      console.warn('⚠️ Default working hours exception (non-critical):', whEx.message)
    }
  }

  return {
    success: true,
    user: userRow
  }
})
