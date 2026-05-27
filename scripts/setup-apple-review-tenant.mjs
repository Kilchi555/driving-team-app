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
 *   3. Creates demo admin, instructor, and customer accounts
 *   4. Seeds event types (lesson / theory / exam)
 *   5. Seeds instructor working hours (Mon–Fri 08–17, Sat 09–13)
 *   6. Seeds staff↔location link (online bookable)
 *   7. Seeds availability settings for the instructor
 *   8. Seeds 10 mock appointments across categories B / A35kW / BE
 *      (past + upcoming, mixed lesson/theory/exam, mixed locations)
 *   9. Seeds 4 mock payments (3 paid, 1 open)
 *
 * Usage:
 *   DEMO_PASSWORD='YourSecurePassword' \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/setup-apple-review-tenant.mjs [--reseed]
 *
 * Flags:
 *   --reseed   Wipes the existing appointments + payments of the demo
 *              customer and seeds a fresh set. Use this to refresh the
 *              dates so the upcoming lessons stay in the future.
 *
 * DEMO_PASSWORD is REQUIRED — the script refuses to run without it so
 * that we never commit a default password to the repository.
 *
 * Where to store the password:
 *   - 1Password / Bitwarden under "Simy → Apple Review demo accounts"
 *   - Paste it into App Store Connect → App Review Information → Notes
 *     so the reviewer sees it without us having to commit it anywhere.
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

const DEMO_PASSWORD = process.env.DEMO_PASSWORD
if (!DEMO_PASSWORD) {
  console.error('❌ Missing DEMO_PASSWORD env var.')
  console.error('   The default password was removed to keep credentials out of git history.')
  console.error('   Re-run with:  DEMO_PASSWORD="YourSecurePass" npm run demo:apple-review:setup')
  process.exit(1)
}
if (DEMO_PASSWORD.length < 12) {
  console.error('❌ DEMO_PASSWORD must be at least 12 characters long.')
  process.exit(1)
}
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
      secondary_color: '#10B981',
      accent_color: '#EC4899',
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
  console.log('📍 Checking locations…')
  const wanted = [
    {
      name: 'Zürich HB',
      address: 'Bahnhofstrasse 1, 8001 Zürich',
      city: 'Zürich', postal_code: '8001', canton: 'ZH',
      latitude: 47.3769, longitude: 8.5417,
      categories: ['B', 'A35kW', 'BE']
    },
    {
      name: 'Zürich Oerlikon',
      address: 'Hofwiesenstrasse 350, 8050 Zürich',
      city: 'Zürich', postal_code: '8050', canton: 'ZH',
      latitude: 47.4108, longitude: 8.5439,
      categories: ['B', 'A35kW']
    }
  ]

  const ids = []
  for (const loc of wanted) {
    const { data: existing } = await supabase
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', loc.name)
      .maybeSingle()
    if (existing) {
      ids.push(existing.id)
      console.log(`   ✓ Location exists: ${loc.name} (${existing.id})`)
      continue
    }

    const { data, error } = await supabase
      .from('locations')
      .insert({
        name: loc.name,
        address: loc.address,
        formatted_address: `${loc.address}, Schweiz`,
        city: loc.city,
        postal_code: loc.postal_code,
        canton: loc.canton,
        latitude: loc.latitude,
        longitude: loc.longitude,
        tenant_id: tenantId,
        is_active: true,
        location_type: 'standard',
        category: loc.categories,
        available_categories: loc.categories
      })
      .select('id')
      .single()
    if (error) throw error
    ids.push(data.id)
    console.log(`   ✓ Location created: ${loc.name} (${data.id})`)
  }

  // Returns the primary (first) location id for the appointment seeding,
  // plus the full list for the location rotation.
  return { primaryId: ids[0], allIds: ids }
}

async function ensureEventTypes(tenantId) {
  console.log('🏷️  Checking event types…')
  const types = [
    { code: 'lesson', name: 'Fahrstunde', emoji: '🚗', description: 'Standard Fahrstunde',  default_duration_minutes: 45, default_color: '#7C3AED', display_order: 0, is_default: true,  allowed_roles: ['staff', 'admin'], public_bookable: true },
    { code: 'theory', name: 'Theorie',    emoji: '📚', description: 'Theorie-Unterricht',   default_duration_minutes: 60, default_color: '#10B981', display_order: 1, is_default: false, allowed_roles: ['staff', 'admin'], public_bookable: true },
    { code: 'exam',   name: 'Prüfung',    emoji: '💪', description: 'Praktische Prüfung',   default_duration_minutes: 45, default_color: '#EF4444', display_order: 2, is_default: false, allowed_roles: ['staff', 'admin'], public_bookable: false, require_payment: true }
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

async function ensureWorkingHours(staffId, tenantId) {
  console.log('🕒 Checking instructor working hours…')
  const { count } = await supabase
    .from('staff_working_hours')
    .select('id', { count: 'exact', head: true })
    .eq('staff_id', staffId)

  if ((count ?? 0) > 0) {
    console.log(`   ✓ ${count} working-hour rules already exist – skipping`)
    return
  }

  // Mon-Fri 08:00-17:00, Sat 09:00-13:00 (day_of_week: 1=Mon, 7=Sun)
  const rows = []
  for (let day = 1; day <= 5; day++) {
    rows.push({
      staff_id: staffId,
      tenant_id: tenantId,
      day_of_week: day,
      start_time: '08:00:00',
      end_time: '17:00:00',
      is_active: true,
      timezone: 'Europe/Zurich'
    })
  }
  rows.push({
    staff_id: staffId,
    tenant_id: tenantId,
    day_of_week: 6,
    start_time: '09:00:00',
    end_time: '13:00:00',
    is_active: true,
    timezone: 'Europe/Zurich'
  })

  const { error } = await supabase.from('staff_working_hours').insert(rows)
  if (error) throw error
  console.log(`   ✓ ${rows.length} working-hour rules seeded (Mon–Fri 08–17, Sat 09–13)`)
}

async function ensureStaffLocations(staffId, tenantId, locationIds) {
  console.log('🔗 Linking instructor to locations…')
  for (const locationId of locationIds) {
    const { data: existing } = await supabase
      .from('staff_locations')
      .select('id')
      .eq('staff_id', staffId)
      .eq('location_id', locationId)
      .maybeSingle()
    if (existing) {
      console.log(`   ✓ Staff↔Location link exists: ${locationId}`)
      continue
    }
    const { error } = await supabase
      .from('staff_locations')
      .insert({
        staff_id: staffId,
        location_id: locationId,
        tenant_id: tenantId,
        is_active: true,
        is_online_bookable: true
      })
    if (error) throw error
    console.log(`   ✓ Staff↔Location link created: ${locationId}`)
  }
}

async function ensureAvailabilitySettings(staffId) {
  console.log('⚙️  Checking instructor availability settings…')
  const { data: existing } = await supabase
    .from('staff_availability_settings')
    .select('id')
    .eq('staff_id', staffId)
    .maybeSingle()
  if (existing) {
    console.log(`   ✓ Availability settings exist`)
    return
  }
  const { error } = await supabase
    .from('staff_availability_settings')
    .insert({
      staff_id: staffId,
      availability_mode: 'working_hours',
      minimum_booking_lead_time_hours: 24,
      pickup_radius_minutes: 30,
      peak_time_morning_start: '07:00:00',
      peak_time_morning_end:   '09:00:00',
      peak_time_evening_start: '16:00:00',
      peak_time_evening_end:   '19:00:00'
    })
  if (error) throw error
  console.log(`   ✓ Availability settings seeded`)
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

async function seedAppointments({ tenantId, customerId, staffId, locationIds, reseed }) {
  console.log('📅 Seeding appointments…')

  if (reseed) {
    const { error: delErr } = await supabase
      .from('appointments')
      .delete()
      .eq('user_id', customerId)
      .eq('tenant_id', tenantId)
    if (delErr) throw delErr
    console.log('   🗑  Existing appointments wiped (--reseed)')
  }

  const { count } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', customerId)
    .eq('tenant_id', tenantId)

  if ((count ?? 0) > 0) {
    console.log(`   ✓ ${count} appointments already exist – skipping seed (use --reseed to force)`)
    return
  }

  const [primaryLocation, secondaryLocation] = locationIds
  const DAY_MS = 24 * 60 * 60 * 1000

  // Build appointments such that every weekday at 10:00 lands on a working
  // day for the instructor (Mon–Sat). The "weekday" is computed at seed
  // time so screenshots always show the same realistic mix.
  const nextWeekday = (offsetDays) => {
    const d = new Date(Date.now() + offsetDays * DAY_MS)
    while (d.getDay() === 0) d.setTime(d.getTime() + DAY_MS) // skip Sunday
    return d
  }

  const slots = [
    // ─── Past (8) ─────────────────────────────────────────────────────
    { offsetDays: -42, hour: 18, dur: 60, type: 'theory', loc: primaryLocation,
      title: 'Verkehrskunde-Theorie Modul 1',
      desc:  'Grundlagen Verkehrsregeln und Vorfahrt' },
    { offsetDays: -35, hour: 10, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Grundausbildung Manöver',
      desc:  'Anhalten, Anfahren, Schulterblick, Rückwärtsfahren' },
    { offsetDays: -28, hour: 14, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Innerorts Zürich West',
      desc:  'Stadtfahrt mit Tram- und Velo-Interaktion' },
    { offsetDays: -21, hour: 9,  dur: 90, type: 'lesson', loc: secondaryLocation,
      title: 'Motorrad A35kW – Grundkurs Tag 1',
      desc:  'Sicherheits-Slalom, Bremsen, Kurvenfahrt' },
    { offsetDays: -19, hour: 9,  dur: 90, type: 'lesson', loc: secondaryLocation,
      title: 'Motorrad A35kW – Grundkurs Tag 2',
      desc:  'Verkehrsumgang und Notbremsung' },
    { offsetDays: -14, hour: 11, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Autobahn A1',
      desc:  'Auffahren, Spurwechsel, Geschwindigkeitsanpassung' },
    { offsetDays: -10, hour: 16, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Nachtfahrt',
      desc:  'Sicht- und Blendverhalten, beleuchtete Strecken' },
    { offsetDays: -5,  hour: 10, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Prüfungssimulation',
      desc:  'Vollständige Prüfungsstrecke unter Realbedingungen' },

    // ─── Upcoming (4) ─────────────────────────────────────────────────
    { offsetDays: 2,   hour: 10, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Kategorie B – Prüfungsvorbereitung Stadt',
      desc:  'Letzter Feinschliff vor der praktischen Prüfung' },
    { offsetDays: 5,   hour: 9,  dur: 60, type: 'exam',   loc: primaryLocation,
      title: 'Praktische Prüfung Kategorie B',
      desc:  'Strassenverkehrsamt Zürich – Albisgüetli' },
    { offsetDays: 9,   hour: 14, dur: 45, type: 'lesson', loc: primaryLocation,
      title: 'Anhängerausbildung BE',
      desc:  'Rückwärtsfahren mit Anhänger und Kurvenfahrt' },
    { offsetDays: 14,  hour: 18, dur: 60, type: 'theory', loc: primaryLocation,
      title: 'Verkehrskunde-Theorie Modul 4',
      desc:  'Ökologie, erste Hilfe, Strassenphysik' }
  ]

  const rows = slots.map(s => {
    const start = nextWeekday(s.offsetDays)
    start.setHours(s.hour, 0, 0, 0)
    const end = new Date(start.getTime() + s.dur * 60 * 1000)
    const isPast = s.offsetDays < 0
    return {
      tenant_id: tenantId,
      user_id: customerId,
      staff_id: staffId,
      location_id: s.loc,
      title: s.title,
      description: s.desc,
      duration_minutes: s.dur,
      type: s.type,
      event_type_code: s.type,
      status: isPast ? 'completed' : 'booked',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      source: 'manual'
    }
  })

  const { error } = await supabase.from('appointments').insert(rows)
  if (error) throw error
  console.log(`   ✓ ${rows.length} appointments seeded (${rows.filter(r => r.status === 'completed').length} past, ${rows.filter(r => r.status === 'booked').length} upcoming)`)
}

async function seedPayments({ tenantId, customerId, staffId, reseed }) {
  console.log('💳 Seeding payments…')

  if (reseed) {
    const { error: delErr } = await supabase
      .from('payments')
      .delete()
      .eq('user_id', customerId)
      .eq('tenant_id', tenantId)
    if (delErr) throw delErr
    console.log('   🗑  Existing payments wiped (--reseed)')
  }

  const { count } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', customerId)
    .eq('tenant_id', tenantId)

  if ((count ?? 0) > 0) {
    console.log(`   ✓ ${count} payments already exist – skipping seed (use --reseed to force)`)
    return
  }

  const now = new Date()
  const DAY = 24 * 60 * 60 * 1000

  const make = ({ days, status, desc, rappen = 11000, method = 'cash' }) => ({
    tenant_id: tenantId,
    user_id: customerId,
    staff_id: staffId,
    lesson_price_rappen: rappen,
    total_amount_rappen: rappen,
    payment_method: method,
    payment_provider: null,
    payment_status: status,
    currency: 'CHF',
    description: desc,
    ...(status === 'paid'
      ? { paid_at: new Date(now.getTime() + days * DAY).toISOString() }
      : { due_date: new Date(now.getTime() + days * DAY).toISOString() })
  })

  const rows = [
    make({ days: -35, status: 'paid',    desc: 'Kategorie B – Grundausbildung Manöver' }),
    make({ days: -28, status: 'paid',    desc: 'Kategorie B – Innerorts Zürich West' }),
    make({ days: -21, status: 'paid',    desc: 'Motorrad A35kW – Grundkurs (2 Tage)', rappen: 56000 }),
    make({ days: -14, status: 'paid',    desc: 'Kategorie B – Autobahn A1' }),
    make({ days:  -7, status: 'pending', desc: 'Kategorie B – Nachtfahrt (offen)' })
  ]

  const { error } = await supabase.from('payments').insert(rows)
  if (error) throw error
  console.log(`   ✓ ${rows.length} payments seeded`)
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🍎 Apple Review Demo-Tenant Setup\n────────────────────────────────\n')

  const tenantId = await ensureTenant()
  const { primaryId: primaryLocationId, allIds: locationIds } = await ensureLocation(tenantId)
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
    first_name: 'Marco', last_name: 'Bianchi'
  })
  const staffId = await ensureUserRow({
    authUserId: instructorAuthId,
    email: DEMO_INSTRUCTOR_EMAIL,
    role: 'staff',
    firstName: 'Marco',
    lastName: 'Bianchi',
    tenantId,
    phone: '+41 79 000 00 02',
    extra: { category: ['B', 'A35kW', 'BE'] }
  })

  // Instructor configuration (working hours, locations, availability)
  await ensureWorkingHours(staffId, tenantId)
  await ensureStaffLocations(staffId, tenantId, locationIds)
  await ensureAvailabilitySettings(staffId)

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
      category: ['B', 'A35kW']
    }
  })

  const reseed = process.argv.includes('--reseed')
  if (reseed) console.log('\n♻️  --reseed flag detected: wiping appointments + payments first')

  await seedAppointments({ tenantId, customerId, staffId, locationIds, reseed })
  await seedPayments({ tenantId, customerId, staffId, reseed })

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
