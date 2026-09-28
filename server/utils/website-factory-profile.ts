/**
 * One profile for both automatic sources and the manual fallback.
 *
 * Source priority when both Google and a website are present:
 * - Name, address, city, postal code, phone, opening hours: Google Place Details.
 * - Email, services, logo, description: the business website.
 * - A customer value always wins, because it is an explicit confirmation.
 * - A city mentioned only in prose stays a suggestion. It is not stored as a fact.
 * - Prices, reviews, team members, and hours are never filled in when absent.
 */
import type { WorkingDaysTemplate } from '~/utils/workingDaysTemplate'
import type { GooglePlaceSource } from '~/server/utils/website-factory-google'
import type { WebsiteExtract } from '~/server/utils/website-factory-extract'

export type FactoryManualInput = {
  businessName?: string | null
  offer?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  websiteUrl?: string | null
  bookingUrl?: string | null
}

export type FactoryService = {
  name: string
  description: string
  priceCents: number | null
}

export type FactoryProfile = {
  businessName: string
  businessType: string
  description: string | null
  offer: string | null
  city: string | null
  address: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  websiteUrl: string | null
  bookingUrl: string | null
  services: FactoryService[]
  openingHours: WorkingDaysTemplate | null
  logoUrl: string | null
  imageUrls: string[]
  googleProfileUrl: string | null
  googlePlaceId: string | null
  facebookUrl: string | null
  instagramUrl: string | null
  rating: number | null
  sources: Record<string, 'google' | 'website' | 'manual'>
}

export type FactoryMissingField = 'businessName' | 'offer' | 'city' | 'contact'

export type FactoryNormalization = {
  profile: FactoryProfile
  missing: FactoryMissingField[]
  suggestions: {
    businessName: string | null
    offer: string | null
    city: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
  conflicts: string[]
}

const DAY_NAME: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7,
}

function text(value: unknown, max: number): string | null {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  if (!cleaned) return null
  return cleaned.slice(0, max)
}

function choose<T>(manual: T | null, google: T | null, website: T | null, field: string, conflicts: string[], sources: FactoryProfile['sources']): T | null {
  if (manual) {
    sources[field] = 'manual'
    return manual
  }
  if (google && website && google !== website) conflicts.push(field)
  if (google) {
    sources[field] = 'google'
    return google
  }
  if (website) {
    sources[field] = 'website'
    return website
  }
  return null
}

export function schemaHoursToRows(rows: WebsiteExtract['openingHours']): Array<{ day: number; opens: string; closes: string }> {
  const out: Array<{ day: number; opens: string; closes: string }> = []
  for (const row of rows) {
    const key = String(row.day || '').split('/').pop()?.toLowerCase() || ''
    const day = DAY_NAME[key]
    if (!day || !/^\d{2}:\d{2}/.test(row.opens) || !/^\d{2}:\d{2}/.test(row.closes)) continue
    out.push({ day, opens: row.opens.slice(0, 5), closes: row.closes.slice(0, 5) })
  }
  return out
}

export function hoursToTemplate(rows: Array<{ day: number; opens: string; closes: string }>): WorkingDaysTemplate | null {
  if (!rows.length) return null
  const schedule: WorkingDaysTemplate['schedule'] = {}
  const days: number[] = []
  for (const row of rows) {
    if (row.day < 1 || row.day > 7) continue
    if (!days.includes(row.day)) days.push(row.day)
    schedule[row.day] = { start: row.opens, end: row.closes }
  }
  if (!days.length) return null
  days.sort((a, b) => a - b)
  return {
    days,
    start_time: schedule[days[0]].start,
    end_time: schedule[days[0]].end,
    schedule,
  }
}

function classify(googleTypes: string[], schemaTypes: string[]): string {
  const all = [...googleTypes, ...schemaTypes].join(' ').toLowerCase()
  if (all.includes('driving_school') || all.includes('drivingschool')) return 'driving_school'
  return 'generic'
}

function social(urls: string[], host: string): string | null {
  return urls.find((url) => {
    try {
      return new URL(url).hostname.toLowerCase().includes(host)
    } catch {
      return false
    }
  }) || null
}

export function normalizeFactoryProfile(input: {
  google?: GooglePlaceSource | null
  website?: WebsiteExtract | null
  suppliedWebsiteUrl?: string | null
  manual?: FactoryManualInput | null
}): FactoryNormalization {
  const google = input.google || null
  const website = input.website || null
  const manual = input.manual || {}
  const conflicts: string[] = []
  const sources: FactoryProfile['sources'] = {}

  const businessName = choose(
    text(manual.businessName, 120),
    text(google?.name, 120),
    text(website?.businessName, 120),
    'businessName',
    conflicts,
    sources,
  )
  const city = choose(
    text(manual.city, 80),
    text(google?.city, 80),
    text(website?.city, 80),
    'city',
    conflicts,
    sources,
  )
  const phone = choose(
    text(manual.phone, 30),
    text(google?.phone, 30),
    text(website?.phone, 30),
    'phone',
    conflicts,
    sources,
  )
  const email = choose(
    text(manual.email, 120)?.toLowerCase() || null,
    null,
    text(website?.email, 120),
    'email',
    conflicts,
    sources,
  )
  const address = choose(
    text(manual.address, 180),
    text(google?.address, 180),
    text(website?.address, 180),
    'address',
    conflicts,
    sources,
  )
  const postalCode = choose(null, text(google?.postalCode, 12), text(website?.postalCode, 12), 'postalCode', conflicts, sources)
  const description = choose(
    null,
    null,
    text(website?.description, 600),
    'description',
    conflicts,
    sources,
  ) || choose(null, text(google?.description, 600), null, 'description', conflicts, sources)

  const manualOffer = text(manual.offer, 180)
  const services: FactoryService[] = (website?.services || [])
    .map((service) => ({
      name: text(service.name, 80) || '',
      description: text(service.description, 180) || '',
      priceCents: service.priceCents,
    }))
    .filter((service) => service.name)
    .slice(0, 12)
  if (!services.length && manualOffer) {
    services.push({ name: manualOffer, description: '', priceCents: null })
    sources.offer = 'manual'
  } else if (services.length) {
    sources.offer = 'website'
  }
  const offer = services[0]?.name || manualOffer

  const googleHours = hoursToTemplate(google?.openingHours || [])
  const websiteHours = hoursToTemplate(schemaHoursToRows(website?.openingHours || []))
  let openingHours: WorkingDaysTemplate | null = null
  if (googleHours && websiteHours) {
    conflicts.push('openingHours')
    openingHours = googleHours
    sources.openingHours = 'google'
  } else if (googleHours) {
    openingHours = googleHours
    sources.openingHours = 'google'
  } else if (websiteHours) {
    openingHours = websiteHours
    sources.openingHours = 'website'
  }

  const websiteUrl = choose(
    text(manual.websiteUrl, 300),
    text(google?.website, 300),
    text(input.suppliedWebsiteUrl || website?.canonicalUrl || website?.pageUrl, 300),
    'websiteUrl',
    conflicts,
    sources,
  )

  const profile: FactoryProfile = {
    businessName: businessName || '',
    businessType: classify(google?.types || [], website?.businessTypes || []),
    description,
    offer,
    city,
    address,
    postalCode,
    phone,
    email,
    websiteUrl,
    bookingUrl: text(manual.bookingUrl, 300),
    services,
    openingHours,
    logoUrl: website?.logoUrl || null,
    imageUrls: website?.imageUrls || [],
    googleProfileUrl: google?.mapsUrl || null,
    googlePlaceId: google?.placeId || null,
    facebookUrl: social(website?.sameAs || [], 'facebook.com'),
    instagramUrl: social(website?.sameAs || [], 'instagram.com'),
    rating: google?.official ? google.rating : null,
    sources,
  }
  if (profile.logoUrl) sources.logoUrl = 'website'

  const missing: FactoryMissingField[] = []
  if (!profile.businessName) missing.push('businessName')
  if (!profile.offer) missing.push('offer')
  if (!profile.city) missing.push('city')
  if (!profile.phone && !profile.email) missing.push('contact')

  return {
    profile,
    missing,
    suggestions: {
      businessName: profile.businessName || null,
      offer: profile.offer || text(website?.description, 180),
      city: profile.city || text(website?.inferredCity, 80),
      phone: profile.phone,
      email: profile.email,
      address: profile.address,
    },
    conflicts,
  }
}
