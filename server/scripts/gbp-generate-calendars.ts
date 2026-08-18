/**
 * Generate 12-month GBP post calendars for all active locations of a tenant.
 * Usage: npx tsx --env-file=.env server/scripts/gbp-generate-calendars.ts
 *
 * Optional: TENANT_ID=...
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TENANT = process.env.TENANT_ID || process.env.GBP_E2E_TENANT_ID || '64259d68-195a-4c68-8875-f1b44d962830'

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    '~': ROOT,
    '~~': ROOT,
    '@': ROOT,
  },
})

const { getSupabaseAdmin } = jiti('../utils/supabase-admin.ts') as typeof import('../utils/supabase-admin')
const { rebuildLocationPostCalendar } = jiti('../utils/gbp-post-calendar.ts') as typeof import('../utils/gbp-post-calendar')

async function main() {
  const supabase = getSupabaseAdmin()
  const { data: locations, error } = await supabase
    .from('gbp_locations')
    .select('id, title')
    .eq('tenant_id', TENANT)
    .eq('is_active', true)
    .order('title')

  if (error) throw new Error(error.message)
  if (!locations?.length) {
    console.error('Keine aktiven GBP-Standorte')
    process.exit(1)
  }

  console.log(`Jahreskalender für ${locations.length} Standorte (tenant ${TENANT})`)
  const results: Array<{ title: string; created?: number; withCopy?: number; error?: string }> = []

  for (const loc of locations) {
    const label = loc.title || loc.id
    console.log(`\n—— ${label} ——`)
    try {
      const result = await rebuildLocationPostCalendar({
        tenantId: TENANT,
        locationId: loc.id,
        onProgress: (ev) => {
          const n = ev.current != null && ev.total != null ? ` ${ev.current}/${ev.total}` : ''
          const detail = ev.detail ? ` — ${ev.detail}` : ''
          console.log(`  [${ev.step}] ${ev.label}${n}${detail}`)
        },
      })
      console.log(`  OK  ${result.created} Slots, ${result.withCopy} Texte`)
      results.push({ title: label, ...result })
    } catch (err: any) {
      const message = err?.statusMessage || err?.message || String(err)
      console.error(`  FEHLER  ${message}`)
      results.push({ title: label, error: message })
    }
  }

  console.log('\n======== Fertig ========')
  for (const r of results) {
    if (r.error) console.log(`✗ ${r.title}: ${r.error}`)
    else console.log(`✓ ${r.title}: ${r.created} Slots, ${r.withCopy} Texte`)
  }

  if (results.some(r => r.error)) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
