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
): Promise<string | null> {
  try {
    const normalized = await normalizeWebsiteMedia(input, slot)
    const hash = createHash('sha1').update(normalized.primary).digest('hex').slice(0, 10)
    const path = `${tenantId}/website/prospect-${slot}-${hash}.webp`
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, normalized.webp, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (error) return null
    const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
    return data.publicUrl || null
  } catch {
    return null
  }
}

export type ProspectMedia = {
  hero_url: string | null
  logo_url: string | null
  gallery: Array<{ url: string; alt: string }>
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

  const heroBuf =
    (scrape?.hero_image_url ? await fetchBufferFromUrl(scrape.hero_image_url) : null) ||
    (allowGooglePhotos && place?.photos?.[0]?.ref ? await fetchPlacePhotoBuffer(place.photos[0].ref) : null)
  const logoBuf = scrape?.logo_url ? await fetchBufferFromUrl(scrape.logo_url) : null

  const hero_url = heroBuf ? await uploadNormalized(supabase, opts.tenantId, 'hero', heroBuf) : null
  const logo_url = logoBuf ? await uploadNormalized(supabase, opts.tenantId, 'logo', logoBuf) : null

  const gallery: ProspectMedia['gallery'] = []
  const placePhotos = allowGooglePhotos ? (place?.photos || []).slice(heroBuf ? 1 : 0, 6) : []
  for (const photo of placePhotos) {
    const buf = await fetchPlacePhotoBuffer(photo.ref)
    if (!buf) continue
    const url = await uploadNormalized(supabase, opts.tenantId, 'service', buf)
    if (url) gallery.push({ url, alt: `${opts.name} — Google Foto` })
  }
  for (const src of (scrape?.images || []).slice(0, 4)) {
    if (gallery.length >= 6) break
    if (src === scrape?.hero_image_url || src === scrape?.logo_url) continue
    const buf = await fetchBufferFromUrl(src)
    if (!buf) continue
    const url = await uploadNormalized(supabase, opts.tenantId, 'service', buf)
    if (url) gallery.push({ url, alt: `${opts.name}` })
  }
  if (hero_url && !gallery.some((g) => g.url === hero_url) && gallery.length < 6) {
    gallery.unshift({ url: hero_url, alt: `${opts.name} — Hero` })
  }

  return { hero_url, logo_url, gallery: gallery.slice(0, 8) }
}
