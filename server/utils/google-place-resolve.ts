/**
 * Resolve Google Place IDs with minimal tenant effort:
 * - extract from Maps / g.page / writereview URLs
 * - Find Place / Text Search by business name + address (CH)
 */
export type ResolvedGooglePlace = {
  place_id: string
  name: string
  address?: string | null
  rating?: number | null
  user_ratings_total?: number | null
  maps_url?: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'url' | 'find_place' | 'text_search'
}

function resolveApiKey(explicit?: string) {
  if (explicit) return explicit
  try {
    const config = useRuntimeConfig()
    return String(config.googleMapsApiKey || '')
  } catch {
    return String(process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '')
  }
}

/** Extract Place ID from common Google URL shapes (no network). */
export function extractPlaceIdFromGoogleUrl(raw: string): string | null {
  const url = String(raw || '').trim()
  if (!url) return null

  const fromQuery = url.match(/[?&#](?:place_id|query_place_id)=([A-Za-z0-9_-]+)/i)
  if (fromQuery?.[1]) return fromQuery[1]

  const fromPlaceIdParam = url.match(/place_id[=:]([A-Za-z0-9_-]+)/i)
  if (fromPlaceIdParam?.[1]) return fromPlaceIdParam[1]

  // writereview?placeid=
  const write = url.match(/[?&]placeid=([A-Za-z0-9_-]+)/i)
  if (write?.[1]) return write[1]

  // Some share links embed ChIJ… literally
  const chij = url.match(/\b(ChIJ[A-Za-z0-9_-]{20,})\b/)
  if (chij?.[1]) return chij[1]

  return null
}

/** Follow redirects (g.page short links) and try to extract place_id. */
export async function resolvePlaceIdFromUrl(rawUrl: string, apiKey?: string): Promise<ResolvedGooglePlace | null> {
  const input = String(rawUrl || '').trim()
  if (!input) return null

  const direct = extractPlaceIdFromGoogleUrl(input)
  if (direct) {
    const details = await fetchPlaceBasics(direct, apiKey)
    return {
      place_id: direct,
      name: details?.name || 'Google Standort',
      address: details?.address || null,
      rating: details?.rating ?? null,
      user_ratings_total: details?.user_ratings_total ?? null,
      maps_url: details?.maps_url || `https://search.google.com/local/writereview?placeid=${direct}`,
      confidence: 'high',
      source: 'url',
    }
  }

  // Follow short links / share URLs
  try {
    const res = await fetch(input, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'SimyPlaceResolver/1.0' },
    })
    const finalUrl = res.url || input
    const fromFinal = extractPlaceIdFromGoogleUrl(finalUrl)
    if (fromFinal) {
      const details = await fetchPlaceBasics(fromFinal, apiKey)
      return {
        place_id: fromFinal,
        name: details?.name || 'Google Standort',
        address: details?.address || null,
        rating: details?.rating ?? null,
        user_ratings_total: details?.user_ratings_total ?? null,
        maps_url: details?.maps_url || finalUrl,
        confidence: 'high',
        source: 'url',
      }
    }
  } catch {
    // ignore network failures
  }

  return null
}

async function fetchPlaceBasics(placeId: string, apiKey?: string) {
  const key = apiKey || resolveApiKey()
  if (!key || !placeId) return null
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=place_id,name,formatted_address,rating,user_ratings_total,url` +
    `&language=de&key=${key}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      result?: {
        name?: string
        formatted_address?: string
        rating?: number
        user_ratings_total?: number
        url?: string
      }
      status?: string
    }
    if (data.status && data.status !== 'OK') return null
    return {
      name: data.result?.name || null,
      address: data.result?.formatted_address || null,
      rating: data.result?.rating ?? null,
      user_ratings_total: data.result?.user_ratings_total ?? null,
      maps_url: data.result?.url || null,
    }
  } catch {
    return null
  }
}

function scoreCandidate(
  candidateName: string,
  tenantName: string,
  candidateAddress: string,
  city?: string | null,
): ResolvedGooglePlace['confidence'] {
  const n = tenantName.toLowerCase().trim()
  const c = candidateName.toLowerCase().trim()
  const addr = candidateAddress.toLowerCase()
  const cityL = String(city || '').toLowerCase().trim()

  const nameHit =
    (n && c.includes(n)) ||
    (c && n.includes(c)) ||
    n.split(/\s+/).filter((w) => w.length > 3).some((w) => c.includes(w))

  const cityHit = cityL ? addr.includes(cityL) : true

  if (nameHit && cityHit) return 'high'
  if (nameHit || cityHit) return 'medium'
  return 'low'
}

/**
 * Suggest Google places for a tenant from name + address (and optional Maps URL).
 */
export async function suggestGooglePlacesForTenant(input: {
  name: string
  address?: string | null
  city?: string | null
  mapsUrl?: string | null
  apiKey?: string
  limit?: number
}): Promise<ResolvedGooglePlace[]> {
  const key = input.apiKey || resolveApiKey()
  const out: ResolvedGooglePlace[] = []
  const seen = new Set<string>()

  const push = (p: ResolvedGooglePlace) => {
    if (!p.place_id || seen.has(p.place_id)) return
    seen.add(p.place_id)
    out.push(p)
  }

  if (input.mapsUrl) {
    const fromUrl = await resolvePlaceIdFromUrl(input.mapsUrl, key)
    if (fromUrl) push(fromUrl)
  }

  if (!key) return out

  const name = String(input.name || '').trim()
  const address = String(input.address || '').trim()
  const city = String(input.city || '').trim()
  const query = [name, address || city, 'Schweiz'].filter(Boolean).join(', ')
  if (query.length < 4) return out

  // 1) Find Place From Text (biased to Switzerland)
  try {
    const findUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(query)}` +
      `&inputtype=textquery` +
      `&fields=place_id,name,formatted_address,rating,user_ratings_total` +
      `&language=de&locationbias=circle:120000@46.8,8.2` +
      `&key=${key}`
    const res = await fetch(findUrl, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{
          place_id?: string
          name?: string
          formatted_address?: string
          rating?: number
          user_ratings_total?: number
        }>
        status?: string
      }
      for (const c of data.candidates || []) {
        if (!c.place_id) continue
        push({
          place_id: c.place_id,
          name: c.name || name,
          address: c.formatted_address || null,
          rating: c.rating ?? null,
          user_ratings_total: c.user_ratings_total ?? null,
          maps_url: `https://search.google.com/local/writereview?placeid=${c.place_id}`,
          confidence: scoreCandidate(c.name || '', name, c.formatted_address || '', city),
          source: 'find_place',
        })
      }
    }
  } catch {
    /* continue */
  }

  // 2) Text Search fallback for more candidates
  if (out.length < 2) {
    try {
      const searchUrl =
        `https://maps.googleapis.com/maps/api/place/textsearch/json` +
        `?query=${encodeURIComponent(query)}` +
        `&language=de&region=ch&key=${key}`
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            place_id?: string
            name?: string
            formatted_address?: string
            rating?: number
            user_ratings_total?: number
          }>
        }
        for (const c of (data.results || []).slice(0, 5)) {
          if (!c.place_id) continue
          push({
            place_id: c.place_id,
            name: c.name || name,
            address: c.formatted_address || null,
            rating: c.rating ?? null,
            user_ratings_total: c.user_ratings_total ?? null,
            maps_url: `https://search.google.com/local/writereview?placeid=${c.place_id}`,
            confidence: scoreCandidate(c.name || '', name, c.formatted_address || '', city),
            source: 'text_search',
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  const limit = Math.min(Math.max(input.limit || 5, 1), 8)
  return out
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 }
      if (rank[a.confidence] !== rank[b.confidence]) return rank[a.confidence] - rank[b.confidence]
      return (b.user_ratings_total || 0) - (a.user_ratings_total || 0)
    })
    .slice(0, limit)
}
