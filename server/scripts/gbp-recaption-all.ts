/**
 * One-shot: regenerate SEO captions for all GBP pool assets (per location).
 * Usage: npx tsx --env-file=.env server/scripts/gbp-recaption-all.ts
 *
 * Optional:
 *   TENANT_ID=... ONLY_WRONG=1 CONCURRENCY=2
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TENANT = process.env.TENANT_ID || process.env.GBP_E2E_TENANT_ID || '64259d68-195a-4c68-8875-f1b44d962830'
const ONLY_WRONG = process.env.ONLY_WRONG === '1'
const CONCURRENCY = Math.max(1, Math.min(4, Number(process.env.CONCURRENCY || 2)))
const BUCKET = 'tenant-assets'

const jiti = createJiti(import.meta.url, {
  interopDefault: true,
  alias: {
    '~': ROOT,
    '~~': ROOT,
    '@': ROOT,
  },
})

const { generateGbpPhotoCaptionFromBuffer } = jiti('../utils/gbp-automation.ts') as typeof import('../utils/gbp-automation')
const { getSupabaseAdmin } = jiti('../utils/supabase-admin.ts') as typeof import('../utils/supabase-admin')

type AssetRow = {
  id: string
  storage_path: string | null
  location_id: string | null
  notes: string | null
  location_title?: string | null
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing')
  const supabase = getSupabaseAdmin()

  const { data: locations, error: locErr } = await supabase
    .from('gbp_locations')
    .select('id, title')
    .eq('tenant_id', TENANT)
  if (locErr) throw locErr
  const titleById = new Map((locations || []).map(l => [l.id, l.title as string]))
  const birmensdorfIds = new Set(
    (locations || []).filter(l => /birmensdorf/i.test(l.title || '')).map(l => l.id),
  )

  const { data: assets, error } = await supabase
    .from('gbp_media_assets')
    .select('id, storage_path, location_id, notes')
    .eq('tenant_id', TENANT)
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  let rows = (assets || []) as AssetRow[]
  if (ONLY_WRONG) {
    rows = rows.filter((a) => {
      if (!a.notes?.toLowerCase().includes('birmensdorf')) return false
      if (!a.location_id) return true
      return !birmensdorfIds.has(a.location_id)
    })
  }

  console.log(`Tenant ${TENANT}`)
  console.log(`Assets to recaption: ${rows.length} (concurrency=${CONCURRENCY}${ONLY_WRONG ? ', only wrong Birmensdorf' : ', all'})`)

  // Cache caption per storage_path + location_id (same file reused across locations)
  const captionCache = new Map<string, string>()
  const fileCache = new Map<string, Buffer>()
  let ok = 0
  let fail = 0

  await mapPool(rows, CONCURRENCY, async (asset, idx) => {
    const locTitle = asset.location_id ? titleById.get(asset.location_id) : null
    const cacheKey = `${asset.storage_path}::${asset.location_id || 'null'}`
    const label = `[${idx + 1}/${rows.length}] ${asset.id.slice(0, 8)} → ${locTitle || 'no-loc'}`

    try {
      let caption = captionCache.get(cacheKey)
      if (!caption) {
        let buf = fileCache.get(asset.storage_path!)
        if (!buf) {
          const { data: file, error: dlError } = await supabase.storage
            .from(BUCKET)
            .download(asset.storage_path!)
          if (dlError || !file) throw new Error(dlError?.message || 'download failed')
          buf = Buffer.from(await file.arrayBuffer())
          fileCache.set(asset.storage_path!, buf)
        }

        caption = await generateGbpPhotoCaptionFromBuffer({
          tenantId: TENANT,
          locationId: asset.location_id,
          imageBuffer: buf,
          draftText: null,
        })
        if (!caption?.trim()) throw new Error('empty caption')
        caption = caption.trim().slice(0, 250)
        captionCache.set(cacheKey, caption)
      }

      const { error: updError } = await supabase
        .from('gbp_media_assets')
        .update({ notes: caption, updated_at: new Date().toISOString() })
        .eq('id', asset.id)
        .eq('tenant_id', TENANT)

      if (updError) throw updError
      ok++
      console.log(`✅ ${label}: ${caption.slice(0, 80)}…`)
    } catch (e: any) {
      fail++
      console.error(`❌ ${label}: ${e?.message || e}`)
    }
  })

  console.log(`Done. ok=${ok} fail=${fail} uniqueCaptions=${captionCache.size}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
