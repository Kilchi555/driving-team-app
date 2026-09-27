/**
 * Google Business Profile via the official Place Details API.
 * Maps HTML is not parsed. A Maps URL is used only to read a Place ID or the
 * place name already present in the path.
 */
import { extractPlaceIdFromGoogleUrl } from '~/server/utils/google-place-resolve'
import { assertPublicHttpUrl, safeFetchPublic, UnsafeUrlError, type DnsLookup, type PinnedResponse } from '~/server/utils/ssrf-guard'

export const GOOGLE_URL_HOSTS = [
  'google.com',
  'google.ch',
  'g.page',
  'goo.gl',
  'maps.app.goo.gl',
  'business.google.com',
  'share.google',
]

export type GooglePlaceSource = {
  placeId: string | null
  name: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  phone: string | null
  website: string | null
  mapsUrl: string | null
  types: string[]
  description: string | null
  rating: number | null
  openingHours: Array<{ day: number; opens: string; closes: string }>
  official: boolean
}

function googleKey() {
  return String(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
}

export function placeNameFromMapsUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    const match = url.pathname.match(/\/maps\/place\/([^/]+)/i)
    if (!match?.[1]) return null
    const name = decodeURIComponent(match[1].replace(/\+/g, ' ')).replace(/-/g, ' ').trim()
    if (name.length < 2 || name.length > 120) return null
    return name
  } catch {
    return null
  }
}

function hhmm(value: string): string | null {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length !== 4) return null
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function mapGooglePeriods(periods: unknown): GooglePlaceSource['openingHours'] {
  if (!Array.isArray(periods)) return []
  const rows: GooglePlaceSource['openingHours'] = []
  for (const period of periods.slice(0, 14)) {
    const open = period?.open
    const close = period?.close
    if (!open || !close) continue
    const googleDay = Number(open.day)
    const day = googleDay === 0 ? 7 : googleDay
    const opens = hhmm(String(open.time || ''))
    const closes = hhmm(String(close.time || ''))
    if (day < 1 || day > 7 || !opens || !closes) continue
    rows.push({ day, opens, closes })
  }
  return rows
}

async function officialPlace(placeId: string, fetchJson: typeof fetch): Promise<Partial<GooglePlaceSource> | null> {
  const key = googleKey()
  if (!key || !/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return null
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set(
    'fields',
    'place_id,name,formatted_address,address_components,formatted_phone_number,website,opening_hours,types,url,editorial_summary,rating',
  )
  url.searchParams.set('language', 'de')
  url.searchParams.set('key', key)
  const response = await fetchJson(url.toString(), { signal: AbortSignal.timeout(8000) })
  if (!response.ok) return null
  const data = await response.json() as {
    status?: string
    result?: {
      name?: string
      formatted_address?: string
      formatted_phone_number?: string
      website?: string
      url?: string
      types?: string[]
      rating?: number
      editorial_summary?: { overview?: string }
      address_components?: Array<{ long_name?: string; types?: string[] }>
      opening_hours?: { periods?: unknown }
    }
  }
  if (data.status && data.status !== 'OK') return null
  const result = data.result || {}
  const components = result.address_components || []
  const find = (type: string) => components.find((row) => row.types?.includes(type))?.long_name || null
  return {
    placeId,
    name: result.name || null,
    address: result.formatted_address || null,
    city: find('locality') || find('postal_town') || null,
    postalCode: find('postal_code') || null,
    phone: result.formatted_phone_number || null,
    website: result.website || null,
    mapsUrl: result.url || null,
    types: result.types || [],
    description: result.editorial_summary?.overview || null,
    rating: typeof result.rating === 'number' ? result.rating : null,
    openingHours: mapGooglePeriods(result.opening_hours?.periods),
    official: true,
  }
}

export async function loadGoogleBusinessSource(
  rawUrl: string,
  deps: {
    lookup?: DnsLookup
    request?: (url: URL, ip: string, maxBytes: number) => Promise<PinnedResponse>
    fetchJson?: typeof fetch
  } = {},
): Promise<GooglePlaceSource> {
  const input = String(rawUrl || '').trim()
  if (!input) {
    return {
      placeId: null, name: null, address: null, city: null, postalCode: null, phone: null,
      website: null, mapsUrl: null, types: [], description: null, rating: null, openingHours: [], official: false,
    }
  }
  await assertPublicHttpUrl(input, { lookup: deps.lookup, allowedHostSuffixes: GOOGLE_URL_HOSTS })
  let placeId = extractPlaceIdFromGoogleUrl(input)
  let finalUrl = input
  if (!placeId) {
    try {
      const followed = await safeFetchPublic(input, {
        lookup: deps.lookup,
        request: deps.request,
        allowedHostSuffixes: GOOGLE_URL_HOSTS,
        maxBytes: 32 * 1024,
        allowedContentTypes: ['text/html', 'application/xhtml+xml', 'text/plain'],
      })
      finalUrl = followed.finalUrl
      placeId = extractPlaceIdFromGoogleUrl(finalUrl)
    } catch (err) {
      if (!(err instanceof UnsafeUrlError)) throw err
    }
  }
  const fromUrl = placeNameFromMapsUrl(finalUrl) || placeNameFromMapsUrl(input)
  const official = placeId ? await officialPlace(placeId, deps.fetchJson || fetch) : null
  return {
    placeId: placeId || official?.placeId || null,
    name: official?.name || fromUrl,
    address: official?.address || null,
    city: official?.city || null,
    postalCode: official?.postalCode || null,
    phone: official?.phone || null,
    website: official?.website || null,
    mapsUrl: official?.mapsUrl || finalUrl,
    types: official?.types || [],
    description: official?.description || null,
    rating: official?.rating ?? null,
    openingHours: official?.openingHours || [],
    official: !!official?.official,
  }
}
