/**
 * Fetches live Google rating + review count for a location.
 * Falls back to static values from business.config.ts if API is unavailable.
 *
 * Usage:
 *   const { rating, reviewCount, isLive } = await useGoogleRating('zuerich')
 */
import { LOCATION_ZUERICH, LOCATION_LACHEN } from '~/business.config'

const fallbacks = {
  zuerich: { rating: LOCATION_ZUERICH.rating.value, reviewCount: LOCATION_ZUERICH.rating.count },
  lachen: { rating: LOCATION_LACHEN.rating.value, reviewCount: LOCATION_LACHEN.rating.count },
}

export function useGoogleRating(locationId: 'zuerich' | 'lachen') {
  const config = useRuntimeConfig()
  const placeId = locationId === 'zuerich'
    ? config.public.placesIdZuerich
    : config.public.placesIdLachen

  const fallback = fallbacks[locationId]

  // Skip API call if no Place ID is configured
  if (!placeId) {
    return {
      rating: ref(fallback.rating),
      reviewCount: ref(fallback.reviewCount),
      isLive: ref(false),
    }
  }

  const { data, error } = useAsyncData(
    `google-rating-${locationId}`,
    () => $fetch<{ rating: number; reviewCount: number }>(`/api/places/${placeId}`),
    { server: true, lazy: false },
  )

  return {
    rating: computed(() => data.value?.rating ?? fallback.rating),
    reviewCount: computed(() => data.value?.reviewCount ?? fallback.reviewCount),
    isLive: computed(() => !error.value && !!data.value),
  }
}
