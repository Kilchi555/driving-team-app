// POST /api/website/media/suggest-hero
// Body: { source: 'stock' | 'ai', hint?: string }
// Returns up to 3 hero candidates (preview URLs + metadata). Does not set hero yet.

import { createHash } from 'node:crypto'
import OpenAI from 'openai'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizeWebsiteMedia } from '~/server/utils/website-media-normalize'
import {
  buildAiHeroPrompt,
  buildStockQueries,
  heroIndustryChips,
  heroIndustryLabel,
} from '~/server/utils/website-hero-prompts'
import { filterLeafCategories } from '~/server/utils/category-groups'
import { resolveWebsiteCity } from '~/server/utils/website-local-seo'
import {
  heroCacheQueryKey,
  loadCachedHeroCandidates,
  saveHeroCandidates,
} from '~/server/utils/website-hero-cache'

export type HeroCandidate = {
  id: string
  preview_url: string
  /** Unsplash CDN URL for production hotlinking */
  hotlink_url?: string | null
  source: 'stock' | 'ai'
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  download_location?: string | null
}

function cityFromTenant(tenant: any): string {
  return resolveWebsiteCity(tenant)
}

function titlesFromLandingBlocks(blocks: unknown): string[] {
  const landing = (blocks as { blocks?: any[] } | null)?.blocks
  const list = Array.isArray(landing) ? landing : []
  const out: string[] = []
  for (const block of list) {
    const services = block?.content?.services
    const products = block?.content?.products
    if (Array.isArray(services)) {
      for (const item of services) {
        const title = String(item?.title || item?.name || '').trim()
        if (title) out.push(title)
      }
    }
    if (Array.isArray(products)) {
      for (const item of products) {
        const title = String(item?.title || item?.name || '').trim()
        if (title) out.push(title)
      }
    }
  }
  return out
}

async function offerTitlesFromWebsite(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
): Promise<string[]> {
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!website?.id) return []
  const { data: home } = await supabase
    .from('website_pages')
    .select('blocks')
    .eq('website_id', website.id)
    .eq('is_home', true)
    .maybeSingle()
  return titlesFromLandingBlocks(home?.blocks).slice(0, 8)
}

async function fetchUnsplashCandidates(
  queries: string[],
  accessKey: string,
  opts?: { excludeIds?: string[]; page?: number },
): Promise<HeroCandidate[]> {
  const seen = new Set<string>(opts?.excludeIds || [])
  const out: HeroCandidate[] = []
  const page = Math.max(1, opts?.page || 1)

  for (const query of queries) {
    if (out.length >= 3) break
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '12')
    url.searchParams.set('page', String(page))
    url.searchParams.set('orientation', 'landscape')
    url.searchParams.set('content_filter', 'high')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw createError({
        statusCode: res.status === 401 || res.status === 403 ? 503 : 502,
        statusMessage:
          res.status === 401 || res.status === 403
            ? 'Unsplash nicht konfiguriert oder Key ungültig'
            : `Unsplash-Fehler (${res.status}): ${text.slice(0, 120)}`,
      })
    }
    const data = await res.json()
    for (const photo of data?.results || []) {
      if (!photo?.id || seen.has(photo.id)) continue
      seen.add(photo.id)
      const preview =
        photo.urls?.regular || photo.urls?.full || photo.urls?.small || null
      if (!preview) continue
      // Prefer full/regular Unsplash CDN URL for hotlinking (images.unsplash.com)
      const hotlink = photo.urls?.regular || photo.urls?.full || preview
      out.push({
        id: `unsplash:${photo.id}`,
        preview_url: preview,
        hotlink_url: hotlink,
        source: 'stock',
        photographer: photo.user?.name || null,
        photographer_url: photo.user?.links?.html
          ? `${photo.user.links.html}?utm_source=simy&utm_medium=referral`
          : null,
        unsplash_url: photo.links?.html
          ? `${photo.links.html}?utm_source=simy&utm_medium=referral`
          : null,
        download_location: photo.links?.download_location || null,
      })
      if (out.length >= 3) break
    }
  }

  return out
}

async function storeAiBuffer(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  buf: Buffer,
  index: number,
): Promise<string> {
  const normalized = await normalizeWebsiteMedia(buf, 'hero')
  const hash = createHash('sha1').update(normalized.primary).digest('hex').slice(0, 10)
  const path = `${tenantId}/website/hero-ai-${hash}-${index}.webp`
  const { error } = await supabase.storage.from('tenant-logos').upload(path, normalized.webp, {
    contentType: 'image/webp',
    upsert: true,
  })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  const {
    data: { publicUrl },
  } = supabase.storage.from('tenant-logos').getPublicUrl(path)
  return publicUrl
}

async function fetchAiCandidates(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  ctx: Parameters<typeof buildAiHeroPrompt>[0],
  apiKey: string,
  count = 3,
): Promise<HeroCandidate[]> {
  const openai = new OpenAI({ apiKey })
  const out: HeroCandidate[] = []
  const n = Math.max(1, Math.min(3, count))

  // DALL·E 3 / gpt-image: generate variants sequentially (n=1 per call)
  for (let i = 0; i < n; i++) {
    const prompt = buildAiHeroPrompt(ctx, i)
    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024',
      quality: 'standard',
      n: 1,
      response_format: 'b64_json',
    })
    const b64 = result.data?.[0]?.b64_json
    if (!b64) continue
    const buf = Buffer.from(b64, 'base64')
    const url = await storeAiBuffer(supabase, tenantId, buf, i)
    out.push({
      id: `ai:${hashShort(url)}-${i}`,
      preview_url: url,
      source: 'ai',
    })
  }

  return out
}

function hashShort(s: string) {
  return createHash('sha1').update(s).digest('hex').slice(0, 8)
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const source = body?.source === 'ai' ? 'ai' : body?.source === 'stock' ? 'stock' : null
  if (!source) {
    throw createError({ statusCode: 400, statusMessage: 'source must be stock or ai' })
  }
  const hint = typeof body?.hint === 'string' ? body.hint.slice(0, 200) : ''
  const excludeIds = Array.isArray(body?.exclude_ids)
    ? body.exclude_ids.map((id: unknown) => String(id).replace(/^unsplash:/, '')).filter(Boolean).slice(0, 60)
    : []
  const page = Math.max(1, Math.min(20, Number(body?.page) || 1))

  const supabase = getSupabaseAdmin()
  const { data: user } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!user?.tenant_id) {
    throw createError({ statusCode: 404, statusMessage: 'User or tenant not found' })
  }
  const adminRoles = new Set(['admin', 'tenant_admin', 'super_admin', 'superadmin'])
  if (!adminRoles.has(String(user.role || ''))) {
    throw createError({ statusCode: 403, statusMessage: 'Only admins can suggest hero images' })
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, business_type, address, invoice_city, slug')
    .eq('id', user.tenant_id)
    .single()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, parent_category_id')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  const leafCategories = filterLeafCategories(categories || []).slice(0, 8)
  const fromDb = leafCategories.map((c: any) => c.name).filter(Boolean)
  const fromLanding = await offerTitlesFromWebsite(supabase, user.tenant_id)
  const categoryHints = [...new Set([...fromDb, ...fromLanding])].slice(0, 8)

  const ctx = {
    business_type: tenant?.business_type,
    name: tenant?.name,
    city: cityFromTenant(tenant),
    address: tenant?.address,
    categories: categoryHints,
    hint: hint || null,
  }

  if (source === 'stock') {
    const config = useRuntimeConfig()
    const key = String(
      config.unsplashAccessKey ||
        process.env['NUXT_UNSPLASH_ACCESS_KEY'] ||
        process.env['UNSPLASH_ACCESS_KEY'] ||
        '',
    ).trim()
    if (!key) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Stock-Fotos nicht konfiguriert (UNSPLASH_ACCESS_KEY fehlt). Bitte eigene Fotos hochladen.',
      })
    }
    const queries = buildStockQueries(ctx)
    const queryKey = heroCacheQueryKey('stock', ctx)
    const cached = await loadCachedHeroCandidates(supabase, {
      source: 'stock',
      queryKey,
      excludeIds,
      limit: 3,
    })
    const need = Math.max(0, 3 - cached.length)
    const fetched = need
      ? await fetchUnsplashCandidates(queries, key, {
          excludeIds: [...excludeIds, ...cached.map((c) => c.id.replace(/^unsplash:/, ''))],
          page,
        })
      : []
    if (fetched.length) await saveHeroCandidates(supabase, { source: 'stock', queryKey, candidates: fetched })
    const candidates = [...cached, ...fetched].slice(0, 3)
    if (!candidates.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Keine passenden Stock-Fotos gefunden. Beschreibung anpassen oder eigene Fotos nutzen.',
      })
    }
    return {
      success: true,
      source: 'stock',
      query: queries[0],
      from_cache: cached.length,
      candidates,
      industry: heroIndustryLabel(tenant?.business_type),
      chips: heroIndustryChips(tenant?.business_type),
      configured: true,
    }
  }

  // AI
  const apiKey = process.env.NUXT_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AI-Bilder nicht konfiguriert (OPENAI_API_KEY fehlt). Bitte eigene Fotos hochladen.',
    })
  }

  try {
    const queryKey = heroCacheQueryKey('ai', ctx)
    const cached = await loadCachedHeroCandidates(supabase, {
      source: 'ai',
      queryKey,
      excludeIds,
      limit: 3,
    })
    const need = Math.max(0, 3 - cached.length)
    const fetched = need ? await fetchAiCandidates(supabase, user.tenant_id, ctx, apiKey, need) : []
    if (fetched.length) await saveHeroCandidates(supabase, { source: 'ai', queryKey, candidates: fetched })
    const candidates = [...cached, ...fetched].slice(0, 3)
    if (!candidates.length) {
      throw createError({
        statusCode: 502,
        statusMessage: 'AI konnte keine Bilder erzeugen. Bitte erneut versuchen oder eigene Fotos nutzen.',
      })
    }
    return {
      success: true,
      source: 'ai',
      from_cache: cached.length,
      candidates,
      industry: heroIndustryLabel(tenant?.business_type),
      chips: heroIndustryChips(tenant?.business_type),
      configured: true,
    }
  } catch (err: any) {
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 502,
      statusMessage: err?.message || 'AI-Bildgenerierung fehlgeschlagen',
    })
  }
})
