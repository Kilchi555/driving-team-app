/**
 * GBP ↔ Website Konsistenz-Check
 * Aufruf: http://localhost:3000/api/check-gbp
 */
import { defineEventHandler } from 'h3'
import { ALL_LOCATIONS, BRAND } from '~/business.config'

const FIELDS = [
  'displayName',
  'formattedAddress',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'rating',
  'userRatingCount',
  'websiteUri',
].join(',')

export default defineEventHandler(async () => {
  const apiKey = useRuntimeConfig().googlePlacesApiKey
  if (!apiKey) return { error: 'GOOGLE_PLACES_API_KEY not set' }

  const results = []

  for (const loc of ALL_LOCATIONS) {
    if (!loc.placeId) {
      results.push({ location: loc.id, skipped: true, reason: 'No Place ID yet' })
      continue
    }

    const url = `https://places.googleapis.com/v1/places/${loc.placeId}?fields=${FIELDS}&key=${apiKey}`
    const data = await $fetch<any>(url).catch(e => ({ error: e.message }))

    const checks: Record<string, { ok: boolean; gbp: unknown; config: unknown }> = {}

    checks.name = {
      ok: data.displayName?.text === loc.gbpName,
      gbp: data.displayName?.text,
      config: loc.gbpName,
    }

    checks.address = {
      ok: (data.formattedAddress ?? '').includes(loc.address.street) && (data.formattedAddress ?? '').includes(loc.address.zip),
      gbp: data.formattedAddress,
      config: `${loc.address.street}, ${loc.address.zip} ${loc.address.city}`,
    }

    const gbpPhone = (data.internationalPhoneNumber ?? '').replace(/\s/g, '')
    checks.phone = {
      ok: gbpPhone === loc.phone,
      gbp: gbpPhone,
      config: loc.phone,
    }

    checks.website = {
      ok: (data.websiteUri ?? '').includes('drivingteam.ch'),
      gbp: data.websiteUri,
      config: BRAND.website,
    }

    checks.rating_fallback = {
      ok: data.rating === loc.rating.value,
      gbp: data.rating,
      config: loc.rating.value,
    }

    checks.review_count_fallback = {
      ok: data.userRatingCount === loc.rating.count,
      gbp: data.userRatingCount,
      config: loc.rating.count,
    }

    const issues = Object.entries(checks).filter(([, v]) => !v.ok)

    results.push({
      location: loc.id,
      gbpName: loc.gbpName,
      openingHours: data.regularOpeningHours?.weekdayDescriptions ?? [],
      configHours: loc.hoursDisplay,
      status: issues.length === 0 ? '✅ all ok' : `⚠️ ${issues.length} issue(s)`,
      issues: issues.map(([k, v]) => ({ field: k, gbp: v.gbp, config: v.config })),
    })
  }

  return { checked: new Date().toISOString(), results }
})
