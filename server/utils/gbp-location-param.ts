import { getQuery, type H3Event } from 'h3'

/**
 * Read optional GBP location UUID from query (?locationId=) or JSON body.
 */
export function getGbpLocationIdFromEvent(event: H3Event, body?: Record<string, unknown> | null): string | null {
  const q = getQuery(event)
  const fromQuery = typeof q.locationId === 'string' ? q.locationId : null
  const fromBody = typeof body?.locationId === 'string' ? body.locationId : null
  return fromBody || fromQuery || null
}
