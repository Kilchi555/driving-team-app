/**
 * Builds high-converting, SEO-ready landing page content for a tenant website.
 * Industry-aware via getTerminologyDefaults(business_type).
 */
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'

export type LandingService = {
  id: string
  name: string
  description: string
  duration_minutes?: number | null
  price_cents?: number | null
  category?: string | null
}

export type LandingTestimonial = {
  id: string
  author: string
  text: string
  rating?: number
}

export type LandingTenantInput = {
  id: string
  name: string
  slug?: string | null
  business_type?: string | null
  description?: string | null
  contact_email?: string | null
  email?: string | null
  contact_phone?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  postal_code?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  logo_url?: string | null
  hero_image_url?: string | null
}

export type LandingBuildInput = {
  tenant: LandingTenantInput
  bio?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  services: LandingService[]
  testimonials: LandingTestimonial[]
  stats?: {
    avg_rating?: number
    total_appointments?: number
    total_testimonials?: number
  }
  bookingUrl: string
  siteUrl: string
}

export type LandingBlock =
  | { type: 'hero'; content: Record<string, any> }
  | { type: 'services'; content: Record<string, any> }
  | { type: 'testimonials'; content: Record<string, any> }
  | { type: 'faq'; content: Record<string, any> }
  | { type: 'cta'; content: Record<string, any> }
  | { type: 'contact'; content: Record<string, any> }

export type LandingPagePayload = {
  seo: {
    title: string
    description: string
    keywords: string
  }
  brand: {
    name: string
    primary: string
    secondary: string
    accent: string
    logo_url: string | null
    hero_image_url: string | null
  }
  bookingUrl: string
  siteUrl: string
  blocks: LandingBlock[]
  schema: Record<string, any>
}

function moneyCHF(cents?: number | null) {
  if (cents == null || Number.isNaN(Number(cents))) return null
  const value = Number(cents) / 100
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}

function cityHint(tenant: LandingTenantInput) {
  return tenant.city?.trim() || null
}

function defaultFaqs(t: Terminology, name: string) {
  return [
    {
      q: `Wie buche ich eine ${t.appointment}?`,
      a: `Über die Online-Terminbuchung auf dieser Seite wählst du einen freien Slot und buchst direkt. ${name} bestätigt den Termin automatisch.`,
    },
    {
      q: `Kann ich eine ${t.appointment} absagen oder umbuchen?`,
      a: `Ja — innerhalb der von ${name} hinterlegten Fristen kannst du Termine online absagen oder verschieben.`,
    },
    {
      q: 'Wie funktioniert die Bezahlung?',
      a: 'Je nach Angebot zahlst du vor Ort, per Rechnung oder online. Schweizer QR-Rechnungen sind möglich.',
    },
    {
      q: `Für wen ist ${name} geeignet?`,
      a: `${name} richtet sich an ${t.clientsPlural}, die unkompliziert ${t.appointmentsPlural} online buchen und klar kommunizieren möchten.`,
    },
  ]
}

export function buildLandingPage(input: LandingBuildInput): LandingPagePayload {
  const t = getTerminologyDefaults(input.tenant.business_type)
  const name = input.tenant.name?.trim() || 'Unser Angebot'
  const city = cityHint(input.tenant)
  const locationBit = city ? ` in ${city}` : ' Schweiz'
  const bio =
    input.bio?.trim() ||
    input.tenant.description?.trim() ||
    `${name}: Online-Terminbuchung für ${t.appointmentsPlural}, klare Preise und Schweizer Service.`

  const primary = input.tenant.primary_color || '#0F766E'
  const secondary = input.tenant.secondary_color || '#134E4A'
  const accent = input.tenant.accent_color || '#F59E0B'

  const seoTitle =
    input.seo_title?.trim() ||
    `Online-Terminbuchung ${name}${city ? ` ${city}` : ''} | ${t.businessNoun}`.slice(0, 60)

  const seoDescription =
    input.seo_description?.trim() ||
    `${name}: Online-Terminbuchung für ${t.appointmentsPlural}${locationBit}. ${t.bookAction} rund um die Uhr — Erinnerungen & klare Preise.`.slice(
      0,
      160,
    )

  const seoKeywords =
    input.seo_keywords?.trim() ||
    [
      `online terminbuchung ${name}`.toLowerCase(),
      `${t.businessNoun} ${city || 'schweiz'}`.toLowerCase(),
      t.bookAction.toLowerCase(),
      'terminbuchungssystem',
      'buchungssystem schweiz',
    ].join(', ')

  const services = input.services.slice(0, 8).map((s) => ({
    id: s.id,
    name: s.name,
    description:
      s.description?.trim() ||
      `Professionelle ${t.appointment} — Dauer ${s.duration_minutes || 60} Min.`,
    duration_minutes: s.duration_minutes || null,
    price_label: moneyCHF(s.price_cents),
  }))

  const testimonials = input.testimonials
    .filter((x) => x.text?.trim())
    .slice(0, 6)
    .map((x) => ({
      id: x.id,
      author: x.author || t.client,
      text: x.text.trim(),
      rating: x.rating || 5,
    }))

  const rating = input.stats?.avg_rating && input.stats.avg_rating > 0 ? input.stats.avg_rating : null

  const blocks: LandingBlock[] = [
    {
      type: 'hero',
      content: {
        brand: name,
        headline: `Online-Terminbuchung für ${t.appointmentsPlural}`,
        subheadline: bio,
        image_url: input.tenant.hero_image_url || null,
        cta_primary_text: t.bookAction,
        cta_primary_url: input.bookingUrl,
        cta_secondary_text: 'Angebot ansehen',
        cta_secondary_url: '#angebot',
        trust: [
          { value: '24/7', label: 'Online buchbar' },
          { value: rating ? `${rating}★` : 'CH', label: rating ? 'Bewertung' : 'Schweiz' },
          { value: 'SMS', label: 'Erinnerungen' },
        ],
      },
    },
    {
      type: 'services',
      content: {
        eyebrow: 'Angebot',
        title: `Unsere ${t.appointmentsPlural}`,
        description: `Wähle dein Format — Preise transparent, Buchung in wenigen Klicks.`,
        services,
      },
    },
  ]

  if (testimonials.length) {
    blocks.push({
      type: 'testimonials',
      content: {
        eyebrow: 'Google Bewertungen',
        title: `Das sagen ${t.clientsPlural}`,
        description: 'Aktuelle Stimmen von Google — live geladen.',
        source: 'google_or_app',
        testimonials,
      },
    })
  } else {
    // Shell so the public page can inject live Google reviews even without app ratings
    blocks.push({
      type: 'testimonials',
      content: {
        eyebrow: 'Google Bewertungen',
        title: `Das sagen ${t.clientsPlural}`,
        description: 'Aktuelle Stimmen von Google — live geladen.',
        source: 'google_or_app',
        testimonials: [],
      },
    })
  }

  blocks.push({
    type: 'faq',
    content: {
      eyebrow: 'FAQ',
      title: 'Häufige Fragen',
      items: defaultFaqs(t, name),
    },
  })

  blocks.push({
    type: 'cta',
    content: {
      headline: `Bereit für deine nächste ${t.appointment}?`,
      subheadline: `Buche online — ${name} kümmert sich um den Rest.`,
      cta_text: t.bookAction,
      cta_url: input.bookingUrl,
    },
  })

  const email = input.tenant.contact_email || input.tenant.email || null
  const phone = input.tenant.contact_phone || input.tenant.phone || null
  blocks.push({
    type: 'contact',
    content: {
      title: 'Kontakt',
      name,
      email,
      phone,
      address: input.tenant.address || null,
      city: input.tenant.city || null,
      postal_code: input.tenant.postal_code || null,
    },
  })

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${input.siteUrl}#business`,
        name,
        description: seoDescription,
        url: input.siteUrl,
        telephone: phone || undefined,
        email: email || undefined,
        image: input.tenant.logo_url || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: input.tenant.address || undefined,
          addressLocality: input.tenant.city || undefined,
          postalCode: input.tenant.postal_code || undefined,
          addressCountry: 'CH',
        },
        ...(rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: rating,
                reviewCount: Math.max(1, input.stats?.total_testimonials || testimonials.length || 1),
              },
            }
          : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${input.siteUrl}#website`,
        url: input.siteUrl,
        name,
        publisher: { '@id': `${input.siteUrl}#business` },
        potentialAction: {
          '@type': 'ReserveAction',
          target: input.bookingUrl,
          name: t.bookAction,
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${input.siteUrl}#faq`,
        mainEntity: defaultFaqs(t, name).map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return {
    seo: {
      title: seoTitle,
      description: seoDescription,
      keywords: seoKeywords,
    },
    brand: {
      name,
      primary,
      secondary,
      accent,
      logo_url: input.tenant.logo_url || null,
      hero_image_url: input.tenant.hero_image_url || null,
    },
    bookingUrl: input.bookingUrl,
    siteUrl: input.siteUrl,
    blocks,
    schema,
  }
}

export function slugifySubdomain(raw: string) {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}
