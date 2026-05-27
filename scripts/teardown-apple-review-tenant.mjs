#!/usr/bin/env node
/**
 * scripts/teardown-apple-review-tenant.mjs
 *
 * Removes the Apple Review demo tenant + everything attached to it.
 * Use with care – this is destructive.
 *
 * Usage:
 *   node scripts/teardown-apple-review-tenant.mjs --confirm
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

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

if (!process.argv.includes('--confirm')) {
  console.error('❌ Refusing to delete without --confirm flag.')
  console.error('   Usage: node scripts/teardown-apple-review-tenant.mjs --confirm')
  process.exit(1)
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://unyjaetebnaexaflpyoc.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const TENANT_SLUG = 'apple-review'
const DEMO_EMAILS = ['apple-review@simy.ch', 'demo-instructor@simy.ch', 'demo-admin@simy.ch']

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('🗑️  Tearing down Apple Review demo tenant…')

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', TENANT_SLUG).maybeSingle()

  if (!tenant) {
    console.log('   ✓ No tenant with slug', TENANT_SLUG, '– nothing to do')
  } else {
    const tenantId = tenant.id
    console.log('   Tenant id:', tenantId)

    // Order matters – respect foreign keys
    const tables = [
      'payment_audit_logs',
      'payment_wallee_transactions',
      'payments',
      'notes',
      'appointments',
      'user_documents',
      'student_credits',
      'credit_transactions',
      'audit_logs',
      'staff_working_hours',
      'staff_locations',
      'staff_monthly_hours',
      'event_types',
      'locations',
      'tenant_settings'
    ]

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('tenant_id', tenantId)
      if (error && !/column .* does not exist/.test(error.message || '')) {
        console.warn(`   ⚠️  ${table}: ${error.message}`)
      } else {
        console.log(`   ✓ Cleared ${table}`)
      }
    }

    // Finally delete users + tenant
    const { error: userErr } = await supabase.from('users').delete().eq('tenant_id', tenantId)
    if (userErr) console.warn('   ⚠️  users:', userErr.message)
    else console.log('   ✓ Cleared users')

    const { error: tenantErr } = await supabase.from('tenants').delete().eq('id', tenantId)
    if (tenantErr) console.warn('   ⚠️  tenants:', tenantErr.message)
    else console.log('   ✓ Deleted tenant')
  }

  // Delete Auth users
  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
  for (const email of DEMO_EMAILS) {
    const user = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      console.log(`   ✓ No auth user for ${email}`)
      continue
    }
    const { error } = await supabase.auth.admin.deleteUser(user.id)
    if (error) console.warn(`   ⚠️  auth ${email}:`, error.message)
    else console.log(`   ✓ Deleted auth user ${email}`)
  }

  console.log('\n✅ Teardown complete.\n')
}

main().catch(err => {
  console.error('❌ Teardown failed:', err)
  process.exit(1)
})
