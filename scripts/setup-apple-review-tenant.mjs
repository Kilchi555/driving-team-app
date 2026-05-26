#!/usr/bin/env node
/**
 * scripts/setup-apple-review-tenant.mjs
 *
 * Creates the demo tenant + demo customer account that we provide to Apple
 * App Review (Submission Form → "App Review Information → Sign-In required").
 *
 * What this script does (idempotent — safe to run multiple times):
 *   1. Creates tenant "Apple Review Fahrschule" (slug: apple-review) if missing
 *   2. Creates a default location for the tenant
 *   3. Creates demo staff (instructor): demo-instructor@simy.ch
 *   4. Creates demo customer: apple-review@simy.ch (the credentials we give to Apple)
 *   5. Seeds 5 mock appointments (3 past, 2 future)
 *   6. Seeds 3 mock payments (2 paid, 1 open)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/setup-apple-review-tenant.mjs
 *
 * Or, if you have a .env at the repo root:
 *   node scripts/setup-apple-review-tenant.mjs
 *
 * The demo customer password defaults to "AppleReview2026!" but can be overridden
 * via the DEMO_PASSWORD env var.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// ─── Load .env if present ────────────────────────────────────────────────────
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    if (!process.env[key]) process.env[key] = val
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY (env or .env)')
  process.exit(1)
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'AppleReview2026!'
const DEMO_CUSTOMER_EMAIL = 'apple-review@simy.ch'
const DEMO_INSTRUCTOR_EMAIL = 'demo-instructor@simy.ch'
const DEMO_ADMIN_EMAIL = 'demo-admin@simy.ch'

const TENANT_SLUG = 'apple-review'
const TENANT_NAME = 'Apple Review Fahrschule'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

async function ensureTenant() {
  console.log('🏢 Checking tenant…')
  const { data: existing, error: fetchErr } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', TENANT_SLUG)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (existing) {
    console.log(`   ✓ Tenant exists: ${existing.name} (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      name: TENANT_NAME,
      slug: TENANT_SLUG,
      business_type: 'driving_school',
      contact_email: 'support@simy.ch',
      contact_phone: '+41 44 000 00 00',
      address: 'Demo Strasse 1, 8000 Zürich',
      primary_color: '#7C3AED',
      language: 'de',
      currency: 'CHF',
      is_active: true,
      is_trial: false,
      subscription_plan: 'demo',
      subscription_status: 'active',
      brand_name: TENANT_NAME,
      brand_tagline: 'Demo-Tenant für Apple App Review',
      timezone: 'Europe/Zurich'
    })
    .select('id')
    .single()

  if (error) throw error
  console.log(`   ✓ Tenant created: ${data.id}`)
  return data.id
}

async function ensureLocation(tenantId) {
  console.log('📍 Checking location…')
  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  if (existing) {
    console.log(`   ✓ Location exists: ${existing.id}`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('locations')
    .insert({
      name: 'Zürich HB',
      address: 'Bahnhofstrasse 1, 8001 Zürich',
      formatted_address: 'Bahnhofstrasse 1, 8001 Zürich, Schweiz',
      city: 'Zürich',
      postal_code: '8001',
      canton: 'ZH',
      latitude: 47.3769,
      longitude: 8.5417,
      tenant_id: tenantId,
      is_active: true,
      location_type: 'standard',
      category: ['B'],
      available_categories: ['B']
    })
    .select('id')
    .single()

  if (error) throw error
  console.log(`   ✓ Location created: ${data.id}`)
  return data.id
}

async function ensureEventTypes(tenantId) {
  console.log('🏷️  Checking event types…')
  const types = [
    { code: 'lesson', name: 'Fahrstunde', emoji: '🚗', description: 'Standard Fahrstunde', default_duration_minutes: 45, default_color: '#7C3AED', display_order: 0, is_default: true, allowed_roles: ['staff', 'admin'], public_bookable: true },
    { code: 'exam',   name: 'Prüfung',    emoji: '💪', description: 'Praktische Prüfung',  default_duration_minutes: 45, default_color: '#EF4444', display_order: 1, is_default: false, allowed_roles: ['staff', 'admin'], public_bookable: false, require_payment: true }
  ]

  for (const t of types) {
    const { data: existing } = await supabase
      .from('event_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', t.code)
      .maybeSingle()
    if (existing) {
      console.log(`   ✓ Event type exists: ${t.code}`)
      continue
    }
    const { error } = await supabase
      .from('event_types')
      .insert({ tenant_id: tenantId, is_active: true, auto_generate_title: true, requires_team_invite: false, ...t })
    if (error) throw error
    console.log(`   ✓ Event type created: ${t.code}`)
  }
}

async function findExistingAuthUser(email) {
  // Supabase admin API has no direct "find by email", so we list and filter.
  // Tenant has small number of users — pagination unnecessary for demo data.
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw error
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null
}

async function ensureAuthUser(email, password, metadata) {
  const existing = await findExistingAuthUser(email)
  if (existing) {
    console.log(`   ✓ Auth user exists: ${email} (${existing.id})`)
    // Refresh password so the demo creds always work
    await supabase.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  })
  if (error) throw error
  console.log(`   ✓ Auth user created: ${email} (${data.user.id})`)
  return data.user.id
}

async function ensureUserRow({ authUserId, email, role, firstName, lastName, tenantId, phone, extra = {} }) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        auth_user_id: authUserId,
        first_name: firstName,
        last_name: lastName,
        role,
        tenant_id: tenantId,
        phone,
        is_active: true,
        ...extra
      })
      .eq('id', existing.id)
    if (updateErr) throw updateErr
    console.log(`   ✓ User row updated: ${email} (${existing.id})`)
    return existing.id
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUserId,
      email,
      role,
      first_name: firstName,
      last_name: lastName,
      tenant_id: tenantId,
      phone,
      is_active: true,
      language: 'de',
      ...extra
    })
    .select('id')
    .single()
  if (error) throw error
  console.log(`   ✓ User row created: ${email} (${data.id})`)
  return data.id
}

async function seedAppointments({ tenantId, customerId, staffId, locationId }) {
  console.log('📅 Seeding appointments…')

  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', customerId)
    .eq('tenant_id', tenantId)

  if ((count ?? 0) > 0) {
    console.log(`   ✓ ${count} appointments already exist – skipping seed`)
    return
  }

  const now = new Date()
  const HOUR_MS = 60 * 60 * 1000
  const DAY_MS = 24 * HOUR_MS

  const slots = [
    { offsetDays: -21, label: 'Grundausbildung Manöver',  status: 'completed' },
    { offsetDays: -14, label: 'Stadtfahrt Zürich',         status: 'completed' },
    { offsetDays: -7,  label: 'Autobahn-Fahrt',            status: 'completed' },
    { offsetDays: 3,   label: 'Prüfungsvorbereitung',      status: 'booked' },
    { offsetDays: 7,   label: 'Praktische Prüfung',        status: 'booked' }
  ]

  const rows = slots.map(s => {
    const start = new Date(now.getTime() + s.offsetDays * DAY_MS)
    start.setHours(10, 0, 0, 0)
    const end = new Date(start.getTime() + 45 * 60 * 1000)
    return {
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      location_id: locationId,
      title: s.label,
      description: `Demo-Termin für Apple App Review – ${s.label}`,
      duration_minutes: 45,
      type: 'lesson',
      event_type_code: 'lesson',
      status: s.status,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      source: 'manual'
    }
  })

  const { error } = await supabase.from('appointments').insert(rows)
  if (error) throw error
  console.log(`   ✓ ${rows.length} appointments seeded`)
}

async function seedPayments({ tenantId, customerId, staffId }) {
  console.log('💳 Seeding payments…')

  const { count } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', customerId)
    .eq('tenant_id', tenantId)

  if ((count ?? 0) > 0) {
    console.log(`   ✓ ${count} payments already exist – skipping seed`)
    return
  }

  const now = new Date()
  const rows = [
    {
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      lesson_price_rappen: 11000, // CHF 110.00
      total_amount_rappen: 11000,
      payment_method: 'wallee',
      payment_provider: 'wallee',
      payment_status: 'paid',
      currency: 'CHF',
      description: 'Fahrstunde Grundausbildung',
      paid_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      lesson_price_rappen: 11000,
      total_amount_rappen: 11000,
      payment_method: 'wallee',
      payment_provider: 'wallee',
      payment_status: 'paid',
      currency: 'CHF',
      description: 'Stadtfahrt Zürich',
      paid_at: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      lesson_price_rappen: 11000,
      total_amount_rappen: 11000,
      payment_method: 'wallee',
      payment_provider: 'wallee',
      payment_status: 'pending',
      currency: 'CHF',
      description: 'Autobahn-Fahrt (offen)',
      due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  const { error } = await supabase.from('payments').insert(rows)
  if (error) throw error
  console.log(`   ✓ ${rows.length} payments seeded`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🍎 Apple Review Demo-Tenant Setup\n────────────────────────────────\n')

  const tenantId = await ensureTenant()
  const locationId = await ensureLocation(tenantId)
  await ensureEventTypes(tenantId)

  console.log('\n👤 Demo Admin')
  const adminAuthId = await ensureAuthUser(DEMO_ADMIN_EMAIL, DEMO_PASSWORD, {
    first_name: 'Demo', last_name: 'Admin'
  })
  await ensureUserRow({
    authUserId: adminAuthId,
    email: DEMO_ADMIN_EMAIL,
    role: 'admin',
    firstName: 'Demo',
    lastName: 'Admin',
    tenantId,
    phone: '+41 79 000 00 01',
    extra: { admin_level: 'tenant_admin', is_primary_admin: true }
  })

  console.log('\n🧑‍🏫 Demo Instructor')
  const instructorAuthId = await ensureAuthUser(DEMO_INSTRUCTOR_EMAIL, DEMO_PASSWORD, {
    first_name: 'Demo', last_name: 'Instructor'
  })
  const staffId = await ensureUserRow({
    authUserId: instructorAuthId,
    email: DEMO_INSTRUCTOR_EMAIL,
    role: 'staff',
    firstName: 'Demo',
    lastName: 'Instructor',
    tenantId,
    phone: '+41 79 000 00 02',
    extra: { category: ['B'] }
  })

  console.log('\n🎓 Demo Customer (Apple Review Account)')
  const customerAuthId = await ensureAuthUser(DEMO_CUSTOMER_EMAIL, DEMO_PASSWORD, {
    first_name: 'Apple', last_name: 'Reviewer'
  })
  const customerId = await ensureUserRow({
    authUserId: customerAuthId,
    email: DEMO_CUSTOMER_EMAIL,
    role: 'client',
    firstName: 'Apple',
    lastName: 'Reviewer',
    tenantId,
    phone: '+41 79 000 00 03',
    extra: {
      assigned_staff_id: staffId,
      assigned_staff_ids: [staffId],
      birthdate: '2000-01-01',
      street: 'Demo Strasse',
      street_nr: '1',
      zip: '8000',
      city: 'Zürich',
      profession: 'App Reviewer',
      category: ['B']
    }
  })

  await seedAppointments({ tenantId, customerId, staffId, locationId })
  await seedPayments({ tenantId, customerId, staffId })

  console.log('\n✅ Setup complete!\n')
  console.log('────── Apple App Review Credentials ──────')
  console.log(`  Tenant Login URL: https://app.simy.ch/${TENANT_SLUG}`)
  console.log(`  Email:            ${DEMO_CUSTOMER_EMAIL}`)
  console.log(`  Password:         ${DEMO_PASSWORD}`)
  console.log('───────────────────────────────────────────\n')
  console.log('  Paste these into App Store Connect → "App Review Information".\n')
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err)
  process.exit(1)
})
