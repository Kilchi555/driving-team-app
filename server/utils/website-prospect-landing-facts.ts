/**
 * Source-grounded landing inputs for website prospect generation.
 * Only explicitly sourced values become facts. Nothing is invented to fill gaps.
 */

export type ProspectServiceFact = {
  id: string
  name: string
  description: string
}

export type ProspectTestimonialFact = {
  id: string
  author: string
  text: string
  rating?: number
}

/** Sourced business type only. Never invents driving_school or similar. */
export function resolveProspectBusinessType(value: unknown): string | null {
  const cleaned = String(value || '').trim()
  if (!cleaned) return null
  return cleaned.slice(0, 80)
}

/**
 * Tenant insert needs a non-empty business_type in current schema paths.
 * `generic` means unknown — not a claimed category.
 */
export function prospectTenantBusinessType(value: unknown): string {
  return resolveProspectBusinessType(value) || 'generic'
}

/** Services only when the scrape (or equivalent source) supplied a name. */
export function prospectServicesFromScrape(
  scrape: { services?: Array<{ name?: unknown; description?: unknown }> | null } | null | undefined,
): ProspectServiceFact[] {
  const rows = Array.isArray(scrape?.services) ? scrape!.services! : []
  const out: ProspectServiceFact[] = []
  for (let i = 0; i < rows.length; i++) {
    const name = String(rows[i]?.name || '').replace(/\s+/g, ' ').trim()
    if (!name) continue
    const description = String(rows[i]?.description || '').replace(/\s+/g, ' ').trim()
    out.push({
      id: `svc-${out.length + 1}`,
      name: name.slice(0, 120),
      description: description.slice(0, 500),
    })
  }
  return out
}

/**
 * USPs only from sourced signals (Google rating, city).
 * Never adds generic marketing promises.
 */
export function prospectUspsFromSources(input: {
  rating?: number | null
  city?: string | null
}): string[] {
  const usps: string[] = []
  if (typeof input.rating === 'number' && Number.isFinite(input.rating) && input.rating > 0) {
    usps.push(`${input.rating}★ auf Google`)
  }
  const city = String(input.city || '').replace(/\s+/g, ' ').trim()
  if (city) usps.push(`Lokal in ${city.slice(0, 80)}`)
  return usps
}

/** Reviews keep only sourced text/author/rating. No default 5★. */
export function prospectTestimonialsFromPlace(
  place: { reviews?: Array<{ author?: unknown; text?: unknown; rating?: unknown }> | null } | null | undefined,
): ProspectTestimonialFact[] {
  const rows = Array.isArray(place?.reviews) ? place!.reviews! : []
  const out: ProspectTestimonialFact[] = []
  for (let i = 0; i < rows.length; i++) {
    const text = String(rows[i]?.text || '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const author = String(rows[i]?.author || '').replace(/\s+/g, ' ').trim() || 'Google'
    const ratingRaw = rows[i]?.rating
    const rating =
      typeof ratingRaw === 'number' && Number.isFinite(ratingRaw) && ratingRaw > 0
        ? ratingRaw
        : undefined
    const row: ProspectTestimonialFact = {
      id: `rev-${out.length + 1}`,
      author: author.slice(0, 120),
      text: text.slice(0, 2000),
    }
    if (rating !== undefined) row.rating = rating
    out.push(row)
  }
  return out
}

/** Prospect shells always treat prices/hours as verified-only (no invented claims). */
export function prospectVerifiedContentFlags() {
  return {
    verified_hours_only: true as const,
    verified_prices_only: true as const,
  }
}
