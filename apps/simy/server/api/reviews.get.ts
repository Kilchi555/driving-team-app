import {
  fallbackReviews,
  fetchPlacesReviews,
  filterReviewsForBusinessType,
} from '../utils/google-reviews'

const ALLOWED = new Set([
  'driving_school',
  'mental_coach',
  'consulting',
  'fitness',
  'tutoring',
  'music_school',
  'dog_training',
  'massage',
])

export default defineCachedEventHandler(
  async (event) => {
    const query = getQuery(event)
    const businessType = String(query.business_type || query.type || '').trim()
    const limit = Math.min(Math.max(Number(query.limit) || 8, 1), 16)

    if (!businessType || !ALLOWED.has(businessType)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'business_type required (e.g. driving_school, fitness)',
      })
    }

    const config = useRuntimeConfig()
    const apiKey = String(config.googleMapsApiKey || '')

    // Only real Places (or explicit fallback bag). Empty places + empty fallback
    // → empty list → UI hides the section (Simy has no product reviews yet).
    let raw = apiKey ? await fetchPlacesReviews(apiKey, businessType) : []
    if (!raw.length) {
      raw = fallbackReviews(businessType)
    }

    const reviews = filterReviewsForBusinessType(raw, businessType, limit)
    const avg =
      reviews.length > 0
        ? Math.round((reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length) * 10) / 10
        : null

    return {
      business_type: businessType,
      source: apiKey && raw.length ? 'google_places' : 'fallback',
      averageRating: avg,
      total: reviews.length,
      reviews,
    }
  },
  {
    maxAge: 60 * 60 * 6,
    name: 'simy-google-reviews',
    getKey: (event) => {
      const q = getQuery(event)
      return `${q.business_type || q.type || 'none'}:${q.limit || 8}`
    },
  }
)
