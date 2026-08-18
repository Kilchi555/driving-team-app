/** Google places that actually feed the public website (not demo / foreign listings). */

export function isDemoWebsiteTenant(opts: { subdomain?: string | null; name?: string | null }) {
  const sub = String(opts.subdomain || '').trim().toLowerCase()
  const name = String(opts.name || '').trim().toLowerCase()
  return sub === 'fahrschule-muster' || name === 'fahrschule muster'
}

export function isForeignGooglePlaceName(name: string | null | undefined) {
  return /driving\s*team|\bskender\b/i.test(String(name || ''))
}

export function parseGoogleReviewPlaces(raw: unknown): Array<{ name?: string; place_id?: string }> {
  let value = raw
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []
  return value
    .filter((p) => p && typeof p === 'object')
    .map((p: any) => ({
      name: p.name ? String(p.name) : undefined,
      place_id: String(p.place_id || p.placeId || '').trim() || undefined,
    }))
}

export function usableGoogleReviewPlaces(
  raw: unknown,
  opts?: { subdomain?: string | null; name?: string | null },
) {
  if (opts && isDemoWebsiteTenant(opts)) return []
  return parseGoogleReviewPlaces(raw).filter(
    (p) => p.place_id && !isForeignGooglePlaceName(p.name),
  )
}

export function hasUsableGoogleReviews(
  raw: unknown,
  opts?: { subdomain?: string | null; name?: string | null },
) {
  return usableGoogleReviewPlaces(raw, opts).length > 0
}
