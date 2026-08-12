/**
 * Fetch Google Places reviews for a tenant using google_review_places place_ids.
 * Reuses the same Places Details API pattern as apps/simy.
 */

export type TenantGoogleReview = {
  id: string
  author: string
  text: string
  rating: number
  link: string
  relativeTime?: string
  sourceLabel?: string
}

export type TenantReviewPlace = {
  name?: string
  place_id?: string
  placeId?: string
  url?: string
}

type PlacesReview = {
  author_name?: string
  text?: string
  rating?: number
  relative_time_description?: string
  author_url?: string
  time?: number
}

function normalizePlaces(raw: unknown): TenantReviewPlace[] {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value.filter((p) => p && typeof p === 'object') as TenantReviewPlace[]
}

export function getTenantPlaceIds(raw: unknown): Array<{ placeId: string; label: string; url?: string }> {
  const places = normalizePlaces(raw)
  const out: Array<{ placeId: string; label: string; url?: string }> = []
  const seen = new Set<string>()

  for (const p of places) {
    let placeId = String(p.place_id || p.placeId || '').trim()
    const url = String(p.url || '').trim()
    if (!placeId && url) {
      // sync extract only (ChIJ / placeid=); short links need async resolve elsewhere
      const m =
        url.match(/[?&#](?:place_id|query_place_id|placeid)=([A-Za-z0-9_-]+)/i) ||
        url.match(/\b(ChIJ[A-Za-z0-9_-]{20,})\b/)
      if (m?.[1]) placeId = m[1]
    }
    if (!placeId || seen.has(placeId)) continue
    seen.add(placeId)
    out.push({
      placeId,
      label: String(p.name || 'Google').trim() || 'Google',
      url: url || undefined,
    })
  }
  return out
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

export function filterTenantGoogleReviews(
  reviews: TenantGoogleReview[],
  limit = 8,
): TenantGoogleReview[] {
  const seen = new Set<string>()
  const out: TenantGoogleReview[] = []

  for (const r of reviews) {
    const text = normalizeText(r.text || '')
    if (text.length < 40) continue
    if ((r.rating || 0) < 4) continue
    const key = `${r.author}|${text.slice(0, 80)}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...r, text })
    if (out.length >= limit) break
  }
  return out
}

export async function fetchTenantGoogleReviews(
  apiKey: string,
  googleReviewPlaces: unknown,
  limit = 8,
): Promise<{
  reviews: TenantGoogleReview[]
  averageRating: number | null
  totalReviewCount: number | null
  source: 'google_places' | 'none'
}> {
  const places = getTenantPlaceIds(googleReviewPlaces)
  if (!apiKey || !places.length) {
    return { reviews: [], averageRating: null, totalReviewCount: null, source: 'none' }
  }

  const collected: TenantGoogleReview[] = []
  let ratingSum = 0
  let ratingCount = 0
  let totalReviewCount = 0

  await Promise.all(
    places.map(async (place) => {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${encodeURIComponent(place.placeId)}` +
        `&fields=name,url,reviews,rating,user_ratings_total` +
        `&language=de&reviews_sort=newest&key=${apiKey}`

      try {
        const res = await fetch(url)
        if (!res.ok) return
        const data = (await res.json()) as {
          result?: {
            reviews?: PlacesReview[]
            url?: string
            rating?: number
            user_ratings_total?: number
            name?: string
          }
          status?: string
        }
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return

        if (typeof data.result?.rating === 'number') {
          ratingSum += data.result.rating
          ratingCount += 1
        }
        if (typeof data.result?.user_ratings_total === 'number') {
          totalReviewCount += data.result.user_ratings_total
        }

        const mapsLink =
          data.result?.url ||
          `https://search.google.com/local/writereview?placeid=${place.placeId}`
        const label = place.label || data.result?.name || 'Google'

        for (const rev of data.result?.reviews || []) {
          if (!rev.text) continue
          collected.push({
            id: `g-${place.placeId}-${rev.time || rev.author_name || collected.length}`,
            author: rev.author_name || 'Google Nutzer',
            text: rev.text,
            rating: Number(rev.rating) || 5,
            link: rev.author_url || mapsLink,
            relativeTime: rev.relative_time_description,
            sourceLabel: label,
          })
        }
      } catch {
        // ignore single-place failures
      }
    }),
  )

  const reviews = filterTenantGoogleReviews(collected, limit)
  const averageRating =
    ratingCount > 0
      ? Math.round((ratingSum / ratingCount) * 10) / 10
      : reviews.length
        ? Math.round((reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length) * 10) / 10
        : null

  return {
    reviews,
    averageRating,
    totalReviewCount: totalReviewCount || null,
    source: reviews.length ? 'google_places' : 'none',
  }
}
