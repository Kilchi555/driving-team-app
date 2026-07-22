import type { UpcomingPgsCourse } from '~/server/api/courses/upcoming-pgs.get'

export interface CourseLocationSchema {
  name: string
  streetAddress?: string
  addressLocality: string
  postalCode?: string
  addressRegion?: string
  addressCountry?: string
}

export interface CourseSchemaMeta {
  name: string
  url: string
  description?: string
  courseWorkload?: string
  educationalLevel?: string
  category?: string
  image?: string
  offerPrice?: string
  offerUrl?: string
  location?: CourseLocationSchema
  fallbackLocations?: CourseLocationSchema[]
}

const BASE_PROVIDER = {
  '@type': 'Organization',
  name: 'Driving Team Fahrschule',
  url: 'https://drivingteam.ch',
  telephone: '+41444310033',
} as const

function buildPostalAddress(location: CourseLocationSchema) {
  return {
    '@type': 'PostalAddress',
    ...(location.streetAddress ? { streetAddress: location.streetAddress } : {}),
    addressLocality: location.addressLocality,
    ...(location.postalCode ? { postalCode: location.postalCode } : {}),
    ...(location.addressRegion ? { addressRegion: location.addressRegion } : {}),
    addressCountry: location.addressCountry || 'CH',
  }
}

function buildPlace(location: CourseLocationSchema) {
  return {
    '@type': 'Place',
    name: location.name,
    address: buildPostalAddress(location),
  }
}

function buildProvider(location?: CourseLocationSchema) {
  if (!location?.streetAddress) return BASE_PROVIDER

  return {
    ...BASE_PROVIDER,
    address: buildPostalAddress(location),
  }
}

function buildLiveInstances(
  courses: UpcomingPgsCourse[],
  fallbackLocation?: CourseLocationSchema,
) {
  return courses.map((course) => {
    const sortedSessions = [...course.sessions].sort((a, b) =>
      a.startIso.localeCompare(b.startIso),
    )
    const startDate = sortedSessions[0]?.startIso?.slice(0, 10)
    const endDate = sortedSessions[sortedSessions.length - 1]?.startIso?.slice(0, 10)
    const availability =
      course.spotsRemaining > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut'

    const instanceLocation = fallbackLocation || (course.city
      ? {
          name: course.city,
          addressLocality: course.city,
          addressCountry: 'CH',
        }
      : undefined)

    return {
      '@type': 'CourseInstance',
      courseMode: 'onsite',
      startDate,
      endDate,
      ...(instanceLocation ? { location: buildPlace(instanceLocation) } : {}),
      offers: {
        '@type': 'Offer',
        priceCurrency: 'CHF',
        availability,
        url: course.bookingUrl
          || `https://app.simy.ch/customer/courses/driving-team/?courseId=${course.id}`,
        ...(course.priceChf ? { price: String(course.priceChf) } : {}),
      },
    }
  })
}

function buildFallbackInstances(meta: CourseSchemaMeta) {
  const locations = [
    ...(meta.location ? [meta.location] : []),
    ...(meta.fallbackLocations ?? []),
  ]

  if (locations.length === 0) return undefined

  return locations.map((location) => ({
    '@type': 'CourseInstance',
    courseMode: 'onsite',
    location: buildPlace(location),
  }))
}

export function buildCourseSchema(
  meta: CourseSchemaMeta,
  courses: UpcomingPgsCourse[] = [],
) {
  const hasLiveInstances = courses.length > 0
  const hasInStock = courses.some((course) => course.spotsRemaining > 0)

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: meta.name,
    url: meta.url,
    provider: buildProvider(meta.location),
  }

  if (meta.description) schema.description = meta.description
  if (meta.courseWorkload) schema.courseWorkload = meta.courseWorkload
  if (meta.educationalLevel) schema.educationalLevel = meta.educationalLevel
  if (meta.category) schema.category = meta.category
  if (meta.image) schema.image = meta.image

  if (meta.offerPrice || meta.offerUrl) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'CHF',
      availability: hasLiveInstances
        ? (hasInStock ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut')
        : 'https://schema.org/InStock',
      ...(meta.offerPrice ? { price: meta.offerPrice } : {}),
      ...(meta.offerUrl ? { url: meta.offerUrl } : {}),
    }
  }

  if (hasLiveInstances) {
    schema.hasCourseInstance = buildLiveInstances(courses, meta.location)
  } else {
    schema.hasCourseInstance = buildFallbackInstances(meta)
  }

  return schema
}
