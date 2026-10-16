import { createHash } from 'node:crypto'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizeWebsiteMedia, type WebsiteMediaSlot } from '~/server/utils/website-media-normalize'
import { PROSPECT_IMAGE_MAX_BYTES, safeFetchImage } from '~/server/utils/ssrf-guard'
import { fetchProspectPlaceDetails } from '~/server/utils/website-prospect-place'
import type { ProspectPlace, ProspectScrape } from '~/server/utils/website-prospect-types'

const IMAGE_BUCKET = 'tenant-logos'
const IMAGE_MIN_BYTES = 2_000

function mapsKey() {
  try {
    return String(useRuntimeConfig().googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  } catch {
    return String(process.env.GOOGLE_MAPS_API_KEY || '').trim()
  }
}

async function fetchBufferFromUrl(url: string): Promise<Buffer | null> {
  try {
    const fetched = await safeFetchImage(url)
    if (fetched.body.length < IMAGE_MIN_BYTES || fetched.body.length > PROSPECT_IMAGE_MAX_BYTES) return null
    return fetched.body
  } catch {
    return null
  }
}

async function fetchPlacePhotoBuffer(ref: string): Promise<Buffer | null> {
  const key = mapsKey()
  if (!key || !ref) return null
  const url =
    `https://maps.googleapis.com/maps/api/place/photo` +
    `?maxwidth=1600&photo_reference=${encodeURIComponent(ref)}&key=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 2_000 || buf.length > 12 * 1024 * 1024) return null
    return buf
  } catch {
    return null
  }
}

async function uploadNormalized(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tenantId: string,
  slot: WebsiteMediaSlot,
  input: Buffer,
): Promise<{ url: string; path: string } | null> {
  try {
    // Reuses the shared website media compression pipeline (sharp → WebP under slot budgets).
    const normalized = await normalizeWebsiteMedia(input, slot)
    const hash = createHash('sha1').update(normalized.primary).digest('hex').slice(0, 10)
    const path = `${tenantId}/website/prospect-${slot}-${hash}.webp`
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, normalized.webp, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (error) return null
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
    if (!data.publicUrl) return null
    return { url: data.publicUrl, path }
  } catch {
    return null
  }
}

export type ProspectMedia = {
  hero_url: string | null
  logo_url: string | null
  gallery: Array<{ url: string; alt: string }>
  /** Storage object paths uploaded during this ingest (tenant-logos bucket). */
  uploaded_paths: string[]
}

/** Restrict cleanup to prospect ingest paths under the tenant prefix. */
export function isProspectIngestStoragePath(path: string, tenantId?: string): boolean {
  const clean = String(path || '').replace(/^\/+/, '')
  if (!clean || clean.includes('..')) return false
  if (tenantId) {
    return clean.startsWith(`${tenantId}/website/prospect-`) && clean.endsWith('.webp')
  }
  return /^[^/]+\/website\/prospect-[a-z]+-[a-f0-9]+\.webp$/i.test(clean)
}

export function storagePathFromProspectPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(String(url))
    const marker = `/object/public/${IMAGE_BUCKET}/`
    const idx = u.pathname.indexOf(marker)
    if (idx < 0) return null
    return decodeURIComponent(u.pathname.slice(idx + marker.length))
  } catch {
    return null
  }
}

/**
 * Idempotent cleanup for blobs uploaded during a failed create. Never call for
 * regenerate when the website/tenant remains, or for paths referenced by a
 * published site.
 */
export async function removeProspectUploadedPaths(
  supabase: { storage: { from: (bucket: string) => { remove: (paths: string[]) => Promise<{ error: unknown }> } } },
  paths: string[],
  tenantId?: string,
): Promise<{ removed: string[]; skipped: string[] }> {
  const unique = [...new Set(paths.map((p) => String(p || '').replace(/^\/+/, '')).filter(Boolean))]
  const allowed = unique.filter((p) => isProspectIngestStoragePath(p, tenantId))
  const skipped = unique.filter((p) => !isProspectIngestStoragePath(p, tenantId))
  if (!allowed.length) return { removed: [], skipped }
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(allowed)
  if (error) return { removed: [], skipped: [...skipped, ...allowed] }
  return { removed: allowed, skipped }
}

export async function ingestProspectMedia(opts: {
  tenantId: string
  name: string
  scrape: ProspectScrape | null
  place: ProspectPlace | null
  placeId?: string | null
  /**
   * Manual prospects may refill an empty photo list from Place Details.
   * places_cron must pass false: an empty list means discovery kept no photos.
   */
  refetchPlacePhotos?: boolean
}): Promise<ProspectMedia> {
  const supabase = getSupabaseAdmin()
  const scrape = opts.scrape
  let place = opts.place
  const allowGooglePhotos = opts.refetchPlacePhotos !== false
  if (allowGooglePhotos && !place?.photos?.length && opts.placeId) {
    const fresh = await fetchProspectPlaceDetails(opts.placeId)
    if (fresh) place = fresh
  }

  const uploaded_paths: string[] = []
  const heroBuf =
    (scrape?.hero_image_url ? await fetchBufferFromUrl(scrape.hero_image_url) : null) ||
    (allowGooglePhotos && place?.photos?.[0]?.ref ? await fetchPlacePhotoBuffer(place.photos[0].ref) : null)
  const logoBuf = scrape?.logo_url ? await fetchBufferFromUrl(scrape.logo_url) : null

  const heroUp = heroBuf ? await uploadNormalized(supabase, opts.tenantId, 'hero', heroBuf) : null
  const logoUp = logoBuf ? await uploadNormalized(supabase, opts.tenantId, 'logo', logoBuf) : null
  if (heroUp) uploaded_paths.push(heroUp.path)
  if (logoUp) uploaded_paths.push(logoUp.path)
  const hero_url = heroUp?.url || null
  const logo_url = logoUp?.url || null

  const gallery: ProspectMedia['gallery'] = []
  const placePhotos = allowGooglePhotos ? (place?.photos || []).slice(heroBuf ? 1 : 0, 6) : []
  for (const photo of placePhotos) {
    const buf = await fetchPlacePhotoBuffer(photo.ref)
    if (!buf) continue
    const up = await uploadNormalized(supabase, opts.tenantId, 'service', buf)
    if (up) {
      uploaded_paths.push(up.path)
      gallery.push({ url: up.url, alt: `${opts.name} — Google Foto` })
    }
  }
  for (const src of (scrape?.images || []).slice(0, 4)) {
    if (gallery.length >= 6) break
    if (src === scrape?.hero_image_url || src === scrape?.logo_url) continue
    const buf = await fetchBufferFromUrl(src)
    if (!buf) continue
    const up = await uploadNormalized(supabase, opts.tenantId, 'service', buf)
    if (up) {
      uploaded_paths.push(up.path)
      gallery.push({ url: up.url, alt: `${opts.name}` })
    }
  }
  if (hero_url && !gallery.some((g) => g.url === hero_url) && gallery.length < 6) {
    gallery.unshift({ url: hero_url, alt: `${opts.name} — Hero` })
  }

  return { hero_url, logo_url, gallery: gallery.slice(0, 8), uploaded_paths }
}
