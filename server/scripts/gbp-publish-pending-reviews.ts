/**
 * Publish pending suggested/failed review replies for a tenant (auto_all catch-up).
 * Usage: npx tsx --env-file=.env server/scripts/gbp-publish-pending-reviews.ts
 *
 * Optional: TENANT_ID=...
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TENANT = process.env.TENANT_ID || '64259d68-195a-4c68-8875-f1b44d962830'

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: { '~': ROOT, '~~': ROOT, '@': ROOT },
})

const { getSupabaseAdmin } = jiti('../utils/supabase-admin.ts') as typeof import('../utils/supabase-admin')
const { replyToGbpReview } = jiti('../utils/gbp.ts') as typeof import('../utils/gbp')

async function main() {
  const supabase = getSupabaseAdmin()
  const { data: rows, error } = await supabase
    .from('gbp_review_actions')
    .select('id, location_id, google_review_id, reviewer_name, suggested_reply, status')
    .eq('tenant_id', TENANT)
    .in('status', ['suggested', 'failed'])

  if (error) throw new Error(error.message)
  if (!rows?.length) {
    console.log('Keine offenen Review-Antworten')
    return
  }

  console.log(`${rows.length} offene Antworten für ${TENANT}`)
  for (const row of rows) {
    const comment = String(row.suggested_reply || '').trim()
    if (!comment) {
      console.log(`  skip ${row.reviewer_name}: kein Text`)
      continue
    }
    try {
      await replyToGbpReview(TENANT, row.google_review_id, comment, row.location_id)
      const nowIso = new Date().toISOString()
      await supabase
        .from('gbp_review_actions')
        .update({
          status: 'published',
          published_reply: comment,
          published_at: nowIso,
          error_message: null,
          mode: 'auto_all',
          updated_at: nowIso,
        })
        .eq('id', row.id)
      console.log(`  OK  ${row.reviewer_name}`)
    } catch (err: any) {
      const message = err?.message || String(err)
      await supabase
        .from('gbp_review_actions')
        .update({
          status: 'failed',
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      console.log(`  FEHLER  ${row.reviewer_name}: ${message}`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
