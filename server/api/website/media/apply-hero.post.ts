// POST /api/website/media/apply-hero
// Apply a chosen stock/AI candidate as the tenant hero image.
// Stock (Unsplash API): HOTLINK original Unsplash CDN URL + trigger download endpoint (API Terms §6).
// AI: keep/store in our bucket.

import { createHash } from 'node:crypto'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizeWebsiteMedia } from '~/server/utils/website-media-normalize'

type ApplyBody = {
  source: 'stock' | 'ai' | 'own'
  preview_url: string
  /** Preferred Unsplash CDN URL for hotlinking (images.unsplash.com) */
  hotlink_url?: string | null
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
  download_location?: string | null
}

function isUnsplashCdnUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return host === 'images.unsplash.com' || host.endsWith('.unsplash.com')
  } catch {
    return false
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid image URL' })
  }
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SimyWebsiteBuilder/1.0' },
    redirect: 'follow',
  })
  if (!res.ok) {
    throw createError({ statusCode: 502, statusMessage: `Bild-Download fehlgeschlagen (${res.status})` })
  }
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1000) {
    throw createError({ statusCode: 400, statusMessage: 'Bild ungültig oder zu klein' })
  }
  if (buf.length > 20 * 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Bild zu gross' })
  }
  return buf
}

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = (await readBody(event)) as ApplyBody
  const source = body?.source
  if (!source || !['stock', 'ai', 'own'].includes(source)) {
    throw createError({ statusCode: 400, statusMessage: 'source must be stock, ai, or own' })
  }
  if (!body?.preview_url || typeof body.preview_url !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'preview_url required' })
  }

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
    throw createError({ statusCode: 403, statusMessage: 'Only admins can apply hero images' })
  }

  let heroUrl = body.preview_url
  let attribution: {
    photographer?: string | null
    photographer_url?: string | null
    unsplash_url?: string | null
  } | null = null

  if (source === 'stock') {
    // Unsplash API Terms: hotlink CDN URLs — do NOT rehost.
    const candidate = (body.hotlink_url || body.preview_url || '').trim()
    if (!isUnsplashCdnUrl(candidate)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Stock-Hero muss eine Unsplash-CDN-URL (images.unsplash.com) hotlinken',
      })
    }
    heroUrl = candidate

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
        statusMessage: 'UNSPLASH_ACCESS_KEY fehlt — Download-Event kann nicht gemeldet werden',
      })
    }
    if (!body.download_location) {
      throw createError({
        statusCode: 400,
        statusMessage: 'download_location fehlt (Unsplash Download-Tracking erforderlich)',
      })
    }

    // Required: notify Unsplash of the download/use event
    const dlRes = await fetch(body.download_location, {
      headers: { Authorization: `Client-ID ${key}` },
    })
    if (!dlRes.ok) {
      throw createError({
        statusCode: 502,
        statusMessage: `Unsplash Download-Trigger fehlgeschlagen (${dlRes.status})`,
      })
    }

    attribution = {
      photographer: body.photographer || null,
      photographer_url: body.photographer_url || null,
      unsplash_url: body.unsplash_url || null,
    }
  } else if (source === 'ai') {
    // AI images are ours — store in our bucket if not already there
    const supabaseHost = (() => {
      try {
        return new URL(process.env.SUPABASE_URL || '').host
      } catch {
        return ''
      }
    })()
    let alreadyOurs = false
    try {
      const host = new URL(body.preview_url).host
      alreadyOurs =
        Boolean(supabaseHost && host.includes(supabaseHost)) || host.includes('supabase.co')
    } catch {
      alreadyOurs = false
    }

    if (!alreadyOurs) {
      const buf = await downloadImage(body.preview_url)
      const normalized = await normalizeWebsiteMedia(buf, 'hero')
      const hash = createHash('sha1').update(normalized.primary).digest('hex').slice(0, 10)
      const path = `${user.tenant_id}/website/hero-ai-${hash}.webp`
      const { error } = await supabase.storage.from('tenant-logos').upload(path, normalized.webp, {
        contentType: 'image/webp',
        upsert: true,
      })
      if (error) throw createError({ statusCode: 500, statusMessage: error.message })
      const {
        data: { publicUrl },
      } = supabase.storage.from('tenant-logos').getPublicUrl(path)
      heroUrl = publicUrl
    }
  }

  const now = new Date().toISOString()
  const { data: website } = await supabase
    .from('website_tenants')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .maybeSingle()

  if (website?.id) {
    await supabase
      .from('website_tenants')
      .update({ hero_image_url: heroUrl, updated_at: now })
      .eq('id', website.id)
  }

  return {
    success: true,
    hero_image_url: heroUrl,
    hero_image_source: source,
    hero_attribution: attribution,
    hotlinked: source === 'stock',
  }
})
