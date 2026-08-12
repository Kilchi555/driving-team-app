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
} from '~/server/utils/website-hero-prompts'
import { filterLeafCategories } from '~/server/utils/category-groups'

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
  if (tenant?.city) return String(tenant.city)
  const addr = String(tenant?.address || '')
  const m = addr.match(/\b\d{4}\s+([A-Za-zÄÖÜäöüÉéÈè\-\s]+)\b/)
  return m?.[1]?.trim().split(',')[0].trim() || ''
}

async function fetchUnsplashCandidates(queries: string[], accessKey: string): Promise<HeroCandidate[]> {
  const seen = new Set<string>()
  const out: HeroCandidate[] = []

  for (const query of queries) {
    if (out.length >= 3) break
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '6')
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
): Promise<HeroCandidate[]> {
  const openai = new OpenAI({ apiKey })
  const out: HeroCandidate[] = []

  // DALL·E 3 / gpt-image: generate 3 variants sequentially (n=1 per call)
  for (let i = 0; i < 3; i++) {
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
    .select('id, name, business_type, address, slug')
    .eq('id', user.tenant_id)
    .single()

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, parent_category_id')
    .eq('tenant_id', user.tenant_id)
    .eq('is_active', true)

  const leafCategories = filterLeafCategories(categories || []).slice(0, 8)

  const ctx = {
    business_type: tenant?.business_type,
    name: tenant?.name,
    city: cityFromTenant(tenant),
    address: tenant?.address,
    categories: leafCategories.map((c: any) => c.name).filter(Boolean),
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
    const candidates = await fetchUnsplashCandidates(queries, key)
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
      candidates,
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
    const candidates = await fetchAiCandidates(supabase, user.tenant_id, ctx, apiKey)
    if (!candidates.length) {
      throw createError({
        statusCode: 502,
        statusMessage: 'AI konnte keine Bilder erzeugen. Bitte erneut versuchen oder eigene Fotos nutzen.',
      })
    }
    return {
      success: true,
      source: 'ai',
      candidates,
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
