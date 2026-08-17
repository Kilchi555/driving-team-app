#!/usr/bin/env node
/**
 * Second demo tenant for Playwright tenant-isolation tests.
 *
 *   npm run demo:e2e-isolation:setup
 *
 * Generates DEMO_PASSWORD unless you pass one. Store the printed value as
 * GitHub secret E2E_ISOLATION_PASSWORD (Apple Review keeps E2E_DEMO_PASSWORD).
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const generatedPassword = !process.env.DEMO_PASSWORD
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || `${randomBytes(18).toString('base64url')}!aA1`

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (DEMO_PASSWORD.length < 12) {
  console.error('DEMO_PASSWORD must be at least 12 characters.')
  process.exit(1)
}

if (generatedPassword) {
  console.log(`Neues Passwort: ${DEMO_PASSWORD}`)
}

const TENANT_SLUG = 'e2e-isolation'
const ADMIN_EMAIL = 'e2e-isolation@simy.ch'
const STAFF_EMAIL = 'e2e-isolation-staff@simy.ch'
const CLIENT_EMAIL = 'e2e-isolation-client@simy.ch'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findAuthUserId(email) {
  const { data } = await supabase.from('users').select('auth_user_id').eq('email', email).maybeSingle()
  if (data?.auth_user_id) return data.auth_user_id

  const { data: link, error } = await supabase.auth.admin.generateLink({ type: 'magiclink', email })
  if (!error && link?.user?.id) return link.user.id
  return null
}

async function ensureAuthUser(email) {
  const existingId = await findAuthUserId(email)
  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    return existingId
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  return data.user.id
}

async function ensureTenant() {
  const { data: existing, error: fetchErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', TENANT_SLUG)
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name: 'E2E Isolation Fahrschule',
      slug: TENANT_SLUG,
      business_type: 'driving_school',
      contact_email: 'support@simy.ch',
      language: 'de',
      currency: 'CHF',
      is_active: true,
      is_trial: false,
      subscription_plan: 'demo',
      subscription_status: 'active',
      brand_name: 'E2E Isolation',
      timezone: 'Europe/Zurich',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureUserRow({ authUserId, email, role, firstName, lastName, tenantId }) {
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  const row = {
    auth_user_id: authUserId,
    email,
    role,
    first_name: firstName,
    last_name: lastName,
    tenant_id: tenantId,
    is_active: true,
    language: 'de',
  }
  if (existing) {
    const { error } = await supabase.from('users').update(row).eq('id', existing.id)
    if (error) throw error
    return existing.id
  }
  const { data, error } = await supabase.from('users').insert(row).select('id').single()
  if (error) throw error
  return data.id
}

async function ensureLocation(tenantId) {
  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', 'E2E Standort')
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: 'E2E Standort',
      address: 'Teststrasse 1, 8000 Zürich',
      city: 'Zürich',
      postal_code: '8000',
      canton: 'ZH',
      tenant_id: tenantId,
      is_active: true,
      location_type: 'standard',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureEventType(tenantId) {
  const { data: existing } = await supabase
    .from('event_types')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('code', 'lesson')
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase
    .from('event_types')
    .insert({
      tenant_id: tenantId,
      code: 'lesson',
      name: 'Fahrstunde',
      description: 'Standard Fahrstunde',
      default_duration_minutes: 45,
      default_color: '#7C3AED',
      display_order: 0,
      is_default: true,
      is_active: true,
      auto_generate_title: true,
      requires_team_invite: false,
      allowed_roles: ['staff', 'admin'],
      public_bookable: true,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureAppointment({ tenantId, customerId, staffId, locationId }) {
  const { data: existing } = await supabase
    .from('appointments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', customerId)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  start.setHours(10, 0, 0, 0)
  const end = new Date(start.getTime() + 45 * 60 * 1000)
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      location_id: locationId,
      title: 'E2E Isolation Lesson',
      description: 'Seeded appointment for tenant-isolation E2E',
      duration_minutes: 45,
      type: 'lesson',
      event_type_code: 'lesson',
      status: 'confirmed',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      source: 'manual',
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

const tenantId = await ensureTenant()
const adminAuthId = await ensureAuthUser(ADMIN_EMAIL)
const staffAuthId = await ensureAuthUser(STAFF_EMAIL)
const clientAuthId = await ensureAuthUser(CLIENT_EMAIL)
await ensureUserRow({
  authUserId: adminAuthId,
  email: ADMIN_EMAIL,
  role: 'admin',
  firstName: 'E2E',
  lastName: 'Admin',
  tenantId,
})
const staffId = await ensureUserRow({
  authUserId: staffAuthId,
  email: STAFF_EMAIL,
  role: 'staff',
  firstName: 'E2E',
  lastName: 'Staff',
  tenantId,
})
const clientId = await ensureUserRow({
  authUserId: clientAuthId,
  email: CLIENT_EMAIL,
  role: 'client',
  firstName: 'E2E',
  lastName: 'Client',
  tenantId,
})
const locationId = await ensureLocation(tenantId)
await ensureEventType(tenantId)
const appointmentId = await ensureAppointment({ tenantId, customerId: clientId, staffId, locationId })

console.log('e2e-isolation tenant ready')
console.log(`  slug:         ${TENANT_SLUG}`)
console.log(`  admin:        ${ADMIN_EMAIL}`)
console.log(`  appointment:  ${appointmentId}`)
console.log('GitHub → Settings → Secrets → E2E_ISOLATION_PASSWORD = the password printed above.')
if (generatedPassword) {
  console.log(`Neues Passwort: ${DEMO_PASSWORD}`)
}
