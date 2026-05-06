// One-time fix: sync payment user_id to match appointment user_id
// Run once with: node scripts/fix-payment-user-sync.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Load .env
const envFile = readFileSync(join(root, '.env'), 'utf-8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.split('=').map((p, i) => i === 0 ? p.trim() : l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')))
    .filter(([k]) => k)
)

const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  console.log('🔍 Finding payments with mismatched user_id vs appointment...')

  // Fetch all payments with their appointment user_id
  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('id, user_id, staff_id, appointment_id')
    .not('appointment_id', 'is', null)

  if (pErr) throw pErr

  const appointmentIds = [...new Set(payments.map(p => p.appointment_id))]

  // Chunk fetch appointments
  let appointments = []
  for (let i = 0; i < appointmentIds.length; i += 200) {
    const chunk = appointmentIds.slice(i, i + 200)
    const { data, error } = await supabase
      .from('appointments')
      .select('id, user_id, staff_id')
      .in('id', chunk)
    if (error) throw error
    appointments = appointments.concat(data)
  }

  const aptMap = Object.fromEntries(appointments.map(a => [a.id, a]))

  const mismatches = payments.filter(p => {
    const apt = aptMap[p.appointment_id]
    if (!apt) return false
    return p.user_id !== apt.user_id || p.staff_id !== apt.staff_id
  })

  if (mismatches.length === 0) {
    console.log('✅ No mismatches found — all payments are in sync.')
    return
  }

  console.log(`\n⚠️  Found ${mismatches.length} payment(s) with mismatched user_id/staff_id:\n`)
  for (const p of mismatches) {
    const apt = aptMap[p.appointment_id]
    console.log(`  Payment ${p.id}`)
    if (p.user_id !== apt.user_id) console.log(`    user_id:  ${p.user_id} → ${apt.user_id}`)
    if (p.staff_id !== apt.staff_id) console.log(`    staff_id: ${p.staff_id} → ${apt.staff_id}`)
  }

  console.log('\n🔧 Applying fixes...')
  let fixed = 0
  for (const p of mismatches) {
    const apt = aptMap[p.appointment_id]
    const update = {}
    if (p.user_id !== apt.user_id) update.user_id = apt.user_id
    if (p.staff_id !== apt.staff_id) update.staff_id = apt.staff_id
    update.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('payments')
      .update(update)
      .eq('id', p.id)

    if (error) {
      console.error(`  ❌ Failed to fix payment ${p.id}:`, error.message)
    } else {
      console.log(`  ✅ Fixed payment ${p.id}`)
      fixed++
    }
  }

  console.log(`\n✅ Done. Fixed ${fixed}/${mismatches.length} payments.`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
