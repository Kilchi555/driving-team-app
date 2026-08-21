import { businessKey, type HeroPromptContext } from '~/server/utils/website-hero-prompts'

export type CachedHeroCandidate = {
  id: string
  preview_url: string
  hotlink_url?: string | null
  source: 'stock' | 'ai'
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  download_location?: string | null
}

type AdminClient = ReturnType<typeof import('~/server/utils/supabase-admin').getSupabaseAdmin>

export function heroCacheQueryKey(
  source: 'stock' | 'ai',
  ctx: Pick<HeroPromptContext, 'business_type' | 'hint'>,
): string {
  const industry = businessKey(ctx.business_type)
  const hint = String(ctx.hint || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return hint ? `${industry}:${source}:${hint}` : `${industry}:${source}:default`
}

function normalizeExcludeIds(ids: string[]): string[] {
  const out = new Set<string>()
  for (const raw of ids) {
    const id = String(raw || '').trim()
    if (!id) continue
    out.add(id)
    out.add(id.replace(/^unsplash:/, ''))
    out.add(id.replace(/^ai:/, ''))
    if (!id.includes(':')) {
      out.add(`unsplash:${id}`)
      out.add(`ai:${id}`)
    }
  }
  return [...out]
}

function rowToCandidate(row: any): CachedHeroCandidate {
  return {
    id: String(row.external_id),
    preview_url: String(row.preview_url),
    hotlink_url: row.hotlink_url || null,
    source: row.source === 'ai' ? 'ai' : 'stock',
    photographer: row.photographer || null,
    photographer_url: row.photographer_url || null,
    unsplash_url: row.unsplash_url || null,
    download_location: row.download_location || null,
  }
}

export async function loadCachedHeroCandidates(
  supabase: AdminClient,
  opts: {
    source: 'stock' | 'ai'
    queryKey: string
    excludeIds: string[]
    limit: number
  },
): Promise<CachedHeroCandidate[]> {
  if (opts.limit <= 0) return []
  let q = supabase
    .from('website_hero_candidates')
    .select(
      'external_id, preview_url, hotlink_url, source, photographer, photographer_url, unsplash_url, download_location',
    )
    .eq('source', opts.source)
    .eq('query_key', opts.queryKey)
    .order('last_served_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
    .limit(Math.max(opts.limit * 4, 12))

  const { data, error } = await q
  if (error || !data?.length) return []

  const blocked = new Set(normalizeExcludeIds(opts.excludeIds))
  const picked: CachedHeroCandidate[] = []
  const servedIds: string[] = []
  for (const row of data) {
    const ext = String(row.external_id || '')
    if (!ext || blocked.has(ext) || blocked.has(ext.replace(/^unsplash:/, '')) || blocked.has(ext.replace(/^ai:/, ''))) {
      continue
    }
    picked.push(rowToCandidate(row))
    servedIds.push(ext)
    if (picked.length >= opts.limit) break
  }

  if (servedIds.length) {
    const now = new Date().toISOString()
    await supabase
      .from('website_hero_candidates')
      .update({ last_served_at: now })
      .eq('source', opts.source)
      .eq('query_key', opts.queryKey)
      .in('external_id', servedIds)
  }

  return picked
}

export async function saveHeroCandidates(
  supabase: AdminClient,
  opts: {
    source: 'stock' | 'ai'
    queryKey: string
    candidates: CachedHeroCandidate[]
  },
): Promise<void> {
  if (!opts.candidates.length) return
  const rows = opts.candidates.map((c) => ({
    source: opts.source,
    query_key: opts.queryKey,
    external_id: c.id,
    preview_url: c.preview_url,
    hotlink_url: c.hotlink_url || null,
    photographer: c.photographer || null,
    photographer_url: c.photographer_url || null,
    unsplash_url: c.unsplash_url || null,
    download_location: c.download_location || null,
    last_served_at: new Date().toISOString(),
  }))
  const { error } = await supabase
    .from('website_hero_candidates')
    .upsert(rows, { onConflict: 'source,query_key,external_id', ignoreDuplicates: true })
  if (error) {
    console.warn('website_hero_candidates upsert skipped:', error.message)
  }
}
