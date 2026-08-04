import { placesForBusinessType, REVIEW_KEYWORDS_BY_TYPE } from '../../data/review-sources'
import fallback from '../../data/google-reviews-fallback.json'

export type PublicGoogleReview = {
  author: string
  text: string
  rating: number
  link: string
  relativeTime?: string
  sourceLabel?: string
}

type PlacesReview = {
  author_name?: string
  text?: string
  rating?: number
  relative_time_description?: string
  author_url?: string
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function matchesBusinessType(text: string, businessType: string) {
  const re = REVIEW_KEYWORDS_BY_TYPE[businessType]
  if (!re) return true
  return re.test(text)
}

export function filterReviewsForBusinessType(
  reviews: PublicGoogleReview[],
  businessType: string,
  limit = 8
): PublicGoogleReview[] {
  const seen = new Set<string>()
  const out: PublicGoogleReview[] = []

  for (const r of reviews) {
    const text = normalizeText(r.text || '')
    if (text.length < 40) continue
    if ((r.rating || 0) < 4) continue
    if (!matchesBusinessType(text, businessType)) continue
    const key = `${r.author}|${text.slice(0, 80)}`.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...r, text })
    if (out.length >= limit) break
  }
  return out
}

export async function fetchPlacesReviews(
  apiKey: string,
  businessType: string
): Promise<PublicGoogleReview[]> {
  const places = placesForBusinessType(businessType)
  if (!places.length) return []

  const collected: PublicGoogleReview[] = []

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
          result?: { reviews?: PlacesReview[]; url?: string }
          status?: string
        }
        if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return
        const mapsLink = data.result?.url || place.mapsUrl
        for (const rev of data.result?.reviews || []) {
          if (!rev.text) continue
          collected.push({
            author: rev.author_name || 'Google Nutzer',
            text: rev.text,
            rating: Number(rev.rating) || 5,
            link: rev.author_url || mapsLink,
            relativeTime: rev.relative_time_description,
            sourceLabel: place.label,
          })
        }
      } catch {
        // ignore single-place failures
      }
    })
  )

  return collected
}

export function fallbackReviews(businessType: string): PublicGoogleReview[] {
  const bag = (fallback as Record<string, PublicGoogleReview[]>)[businessType] || []
  return bag.map((r) => ({ ...r }))
}
