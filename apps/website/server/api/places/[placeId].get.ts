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

  // Basic-tier fields only (rating, user_ratings_total) = free
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total&key=${apiKey}`

  const response = await $fetch<{
    status: string
    result?: { name: string; rating: number; user_ratings_total: number }
  }>(url)

  if (response.status !== 'OK' || !response.result) {
    throw createError({ statusCode: 502, message: `Google Places API error: ${response.status}` })
  }

  const result: PlacesRatingResult = {
    name: response.result.name,
    rating: response.result.rating,
    reviewCount: response.result.user_ratings_total,
    fetchedAt: new Date().toISOString(),
  }

  // Cache for 1 hour (3600 seconds)
  await storage.setItem(cacheKey, result, { ttl: 3600 })

  return result
})
