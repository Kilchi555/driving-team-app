#!/usr/bin/env node
/**
 * scripts/teardown-apple-review-tenant.mjs
 *
 * Removes the Apple Review demo tenant + everything attached to it.
 * Use with care – this is destructive.
 *
 * Usage:
 *   SIMY_ENV_TARGET=simy-test \
 *   SUPABASE_URL=https://kssqalisscxkhvorqwgy.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/teardown-apple-review-tenant.mjs --confirm
 *
 * Refuses to run without --confirm. There is no production URL fallback.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { planTeardownAction, resolveAuthUserId, safeErrorText } from './simy-e2e-safety.mjs'

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

const teardownPlan = planTeardownAction(process.env, process.argv)
if (!teardownPlan.ok) {
  console.error(teardownPlan.message)
  process.exit(teardownPlan.exitCode)
}

const TENANT_SLUG = 'apple-review'
const DEMO_EMAILS = ['apple-review@simy.ch', 'demo-instructor@simy.ch', 'demo-admin@simy.ch']

const supabase = createClient(teardownPlan.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
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

  for (const email of DEMO_EMAILS) {
    const userId = await resolveAuthUserId(supabase, email)
    if (!userId) {
      console.log(`   ✓ No auth user for ${email}`)
      continue
    }
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) console.warn(`   ⚠️  auth ${email}:`, safeErrorText(error))
    else console.log(`   ✓ Deleted auth user ${email}`)
  }

  console.log('\n✅ Teardown complete.\n')
}

main().catch(err => {
  console.error(safeErrorText(err))
  process.exit(1)
})
