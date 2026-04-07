/**
 * Google Places API – Place Details (server-side, cached 1h)
 *
 * Fetches rating + review count for a given Place ID.
 * Uses only Basic-tier fields → free of charge.
 *
 * Required env var: GOOGLE_PLACES_API_KEY
 */
import { defineEventHandler, getRouterParam, createError } from 'h3'

export interface PlacesRatingResult {
  name: string
  rating: number
  reviewCount: number
  fetchedAt: string
}

export default defineEventHandler(async (event): Promise<PlacesRatingResult> => {
  const placeId = getRouterParam(event, 'placeId')
  if (!placeId) throw createError({ statusCode: 400, message: 'Missing placeId' })

  const config = useRuntimeConfig()
  const apiKey = config.googlePlacesApiKey
  if (!apiKey) throw createError({ statusCode: 500, message: 'GOOGLE_PLACES_API_KEY not set' })

  // Server-side cache via Nitro storage (1 hour TTL)
  const storage = useStorage('cache')
  const cacheKey = `places-rating:${placeId}`
  const cached = await storage.getItem<PlacesRatingResult>(cacheKey)
  if (cached) return cached

  // Places API (New) – v1 endpoint, Basic-tier fields = free
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=displayName,rating,userRatingCount&key=${apiKey}`

  const response = await $fetch<{
    displayName?: { text: string }
    rating?: number
    userRatingCount?: number
    error?: { message: string }
  }>(url)

  if (response.error || response.rating === undefined) {
    throw createError({ statusCode: 502, message: `Google Places API error: ${response.error?.message ?? 'no rating returned'}` })
  }

  const result: PlacesRatingResult = {
    name: response.displayName?.text ?? '',
    rating: response.rating,
    reviewCount: response.userRatingCount ?? 0,
    fetchedAt: new Date().toISOString(),
  }

  // Cache for 24 hours (86400 seconds) – ratings don't change that fast
  await storage.setItem(cacheKey, result, { ttl: 86400 })

  return result
})
