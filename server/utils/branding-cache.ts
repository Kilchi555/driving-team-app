/**
 * Lightweight in-memory TTL cache for public tenant branding data.
 *
 * Only used for anonymous (unauthenticated) requests. Authenticated admin
 * requests bypass the cache so they always get fresh data (incl. custom CSS/JS).
 *
 * TTL: 60 seconds — branding data changes rarely; this eliminates duplicate
 * calls from middleware + plugin + page loading the same slug simultaneously.
 */

interface CacheEntry {
  data: any
  expiresAt: number
}

const TTL_MS = 60_000 // 60 seconds
const cache = new Map<string, CacheEntry>()

export function getBrandingCache(key: string): any | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setBrandingCache(key: string, data: any): void {
  cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

export function invalidateBrandingCache(slug?: string, id?: string): void {
  if (slug) cache.delete(`slug:${slug}`)
  if (id) cache.delete(`id:${id}`)
}
