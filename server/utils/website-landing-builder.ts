/**
 * Builds high-converting, SEO-ready landing page content for a tenant website.
 * Industry-aware via getTerminologyDefaults(business_type).
 * Local SEO defaults: business + city first (not SaaS booking jargon).
 * Premium (CHF 490): team/courses shells, map/hours/legal/WhatsApp, richer schema.
 */
import { getTerminologyDefaults } from '~/composables/useTerminology'
import {
  buildLocalFaqs,
  buildLocalSeoDefaults,
  extractCityFromAddress,
  schemaBusinessType,
} from '~/server/utils/website-local-seo'
import { buildConfirmationProcessStep } from '~/server/utils/website-confirmation-copy'
import {
  formatOpeningHours,
  mapsEmbedUrl,
  mapsExternalUrl,
  openingHoursToSchema,
  pickTemplateVariant,
  resolveWorkingTemplate,
  whatsappUrlFromPhone,
  type LandingTeamMember,
  type OpeningHoursRow,
  type UpcomingCourseCard,
} from '~/server/utils/website-premium'

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
  working_days_template?: unknown
  company_type?: string | null
  uid_number?: string | null
  first_name?: string | null
  last_name?: string | null
  google_review_places?: unknown
  website_facebook?: string | null
  website_instagram?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type HeroAttribution = {
  photographer?: string | null
  photographer_url?: string | null
  unsplash_url?: string | null
}

export type LandingBuildInput = {
  tenant: LandingTenantInput
  bio?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  /** Customer-facing address form on the landing page */
  formal_address?: 'sie' | 'du'
  hero_image_source?: 'own' | 'stock' | 'ai' | null
  hero_attribution?: HeroAttribution | null
  services: LandingService[]
  testimonials: LandingTestimonial[]
  /** Where baked testimonials come from when Google live feed is absent */
  testimonials_source?: 'manual' | 'app' | 'google_or_app'
  stats?: {
    avg_rating?: number
    total_appointments?: number
    total_testimonials?: number
  }
  bookingUrl: string
  siteUrl: string
  /** Live-injected at read time; optional at build */
  team?: LandingTeamMember[]
  courses?: UpcomingCourseCard[]
  slots?: import('~/server/utils/website-premium').WebsiteTeaserSlotCard[]
  gallery?: Array<{ url: string; alt?: string }>
  hide_powered_by?: boolean
  template?: 'classic' | 'bold' | 'editorial'
  /** Which contact channels to surface on the landing */
  contact_channels?: {
    phone?: boolean
    email?: boolean
    whatsapp?: boolean
    form?: boolean
  }
  /** Tenant booking_policy — drives confirmation channel copy in process step */
  booking_policy?: Record<string, any> | null
}

export type LandingBlock =
  | { type: 'hero'; content: Record<string, any> }
  | { type: 'services'; content: Record<string, any> }
  | { type: 'team'; content: Record<string, any> }
  | { type: 'courses'; content: Record<string, any> }
  | { type: 'slots'; content: Record<string, any> }
  | { type: 'gallery'; content: Record<string, any> }
  | { type: 'process'; content: Record<string, any> }
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
    hero_video_url?: string | null
    formal_address: 'sie' | 'du'
    hero_image_source?: 'own' | 'stock' | 'ai' | null
    hero_attribution?: HeroAttribution | null
    hide_powered_by?: boolean
    template?: 'classic' | 'bold' | 'editorial'
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

function serviceBookUrl(bookingUrl: string, category?: string | null) {
  if (!category) return bookingUrl
  const cat = String(category).trim()
  if (!cat) return bookingUrl
  const sep = bookingUrl.includes('?') ? '&' : '?'
  return `${bookingUrl}${sep}category=${encodeURIComponent(cat)}`
}

export function buildLandingPage(input: LandingBuildInput): LandingPagePayload {
  const t = getTerminologyDefaults(input.tenant.business_type)
  const name = input.tenant.name?.trim() || 'Unser Angebot'
  const city =
    extractCityFromAddress(input.tenant.address, input.tenant.city) || cityHint(input.tenant) || ''
  const formal = input.formal_address === 'du' ? 'du' : 'sie'
  const local = buildLocalSeoDefaults({
    name,
    business_type: input.tenant.business_type,
    city: city || null,
    address: input.tenant.address,
    categories: input.services.map((s) => s.name || s.category || '').filter(Boolean),
    formal_address: formal,
  })

  const bio = input.bio?.trim() || input.tenant.description?.trim() || local.bio

  const primary = input.tenant.primary_color || '#0F766E'
  const secondary = input.tenant.secondary_color || '#134E4A'
  const accent = input.tenant.accent_color || '#F59E0B'

  const seoTitle = input.seo_title?.trim() || local.title
  const seoDescription = input.seo_description?.trim() || local.description
  const seoKeywords = input.seo_keywords?.trim() || local.keywords

  const services = input.services.slice(0, 8).map((s) => ({
    id: s.id,
    name: s.name,
    description:
      s.description?.trim() ||
      `Professionelle ${t.appointment} — Dauer ${s.duration_minutes || 60} Min.`,
    duration_minutes: s.duration_minutes || null,
    price_label: moneyCHF(s.price_cents),
    price_cents: s.price_cents ?? null,
    category: s.category || null,
    book_url: serviceBookUrl(input.bookingUrl, s.category || s.name),
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
  const faqs = buildLocalFaqs(t, name, formal, input.tenant.business_type, city || null)

  const hoursTpl = resolveWorkingTemplate(input.tenant)
  const hoursRows: OpeningHoursRow[] = formatOpeningHours(hoursTpl)
  const email = input.tenant.contact_email || input.tenant.email || null
  const phone = input.tenant.contact_phone || input.tenant.phone || null
  const wa = whatsappUrlFromPhone(phone)
  const addrParts = [input.tenant.address, input.tenant.postal_code, city || input.tenant.city]
  const mapEmbed = mapsEmbedUrl(addrParts)
  const mapLink = mapsExternalUrl(addrParts)

  const trust: Array<{ value: string; label: string; icon: string }> = [
    { value: 'Online', label: 'Jederzeit buchbar', icon: 'clock' },
  ]
  if (rating) trust.push({ value: `${rating}★`, label: 'Bewertung', icon: 'star' })
  else trust.push({ value: 'CH', label: 'Schweiz', icon: 'shield' })
  if (wa) trust.push({ value: 'WhatsApp', label: 'Direkt schreiben', icon: 'chat' })
  else trust.push({ value: 'SMS', label: 'Erinnerungen', icon: 'chat' })

  const blocks: LandingBlock[] = [
    {
      type: 'hero',
      content: {
        brand: name,
        headline: local.headline,
        subheadline: bio,
        image_url: input.tenant.hero_image_url || null,
        image_alt: city ? `${name} — ${t.businessNoun} ${city}` : `${name} — ${t.businessNoun}`,
        cta_primary_text: t.bookAction,
        cta_primary_url: input.bookingUrl,
        cta_secondary_text: 'Angebot ansehen',
        cta_secondary_url: '#angebot',
        trust,
        whatsapp_url: wa,
      },
    },
    {
      type: 'services',
      content: {
        eyebrow: 'Angebot',
        title: city ? `${t.appointmentsPlural} ${city}` : `Unsere ${t.appointmentsPlural}`,
        description:
          formal === 'du'
            ? `Wähle dein Format — Preise transparent, Buchung in wenigen Klicks.`
            : `Wählen Sie Ihr Format — Preise transparent, Buchung in wenigen Klicks.`,
        services,
      },
    },
  ]

  const slots = input.slots || []
  blocks.push({
    type: 'slots',
    content: {
      eyebrow: 'Termine',
      title: formal === 'du' ? 'Nächste freie Fahrstunden' : 'Nächste freie Fahrstunden',
      description:
        formal === 'du'
          ? 'Aktuelle Verfügbarkeit — mit Klick öffnest du den Live-Kalender.'
          : 'Aktuelle Verfügbarkeit — mit Klick öffnen Sie den Live-Kalender.',
      items: slots,
      cta_text: t.bookAction,
      cta_url: input.bookingUrl,
    },
  })

  const testimonialSource = input.testimonials_source || 'manual'
  const testimonialEyebrow =
    testimonialSource === 'manual' ? 'Kundenstimmen' : 'Google Bewertungen'
  const testimonialDesc =
    testimonialSource === 'manual'
      ? 'Echte Rückmeldungen von Kundinnen und Kunden.'
      : 'Aktuelle Stimmen von Google — live geladen.'

  blocks.push({
    type: 'testimonials',
    content: {
      eyebrow: testimonialEyebrow,
      title: `Das sagen ${t.clientsPlural}`,
      description: testimonialDesc,
      source: testimonialSource,
      testimonials,
    },
  })

  blocks.push({
    type: 'process',
    content: {
      eyebrow: 'Ablauf',
      title: formal === 'du' ? 'So einfach geht’s' : 'So einfach geht es',
      steps: [
        {
          n: 1,
          title: 'Online buchen',
          text:
            formal === 'du'
              ? 'Wähle Termin, Kategorie und Treffpunkt in wenigen Klicks.'
              : 'Wählen Sie Termin, Kategorie und Treffpunkt in wenigen Klicks.',
        },
        {
          n: 2,
          ...buildConfirmationProcessStep(input.booking_policy || (tenant as any).booking_policy, formal),
        },
        {
          n: 3,
          title: formal === 'du' ? 'Losfahren' : 'Losfahren',
          text: `${name} begleitet ${formal === 'du' ? 'dich' : 'Sie'} Schritt für Schritt.`,
        },
      ],
    },
  })

  const team = input.team || []
  blocks.push({
    type: 'team',
    content: {
      eyebrow: 'Team',
      title: formal === 'du' ? 'Dein Team vor Ort' : 'Ihr Team vor Ort',
      description:
        formal === 'du'
          ? 'Lerne die Menschen kennen, die dich begleiten.'
          : 'Lernen Sie die Menschen kennen, die Sie begleiten.',
      members: team,
    },
  })

  const courses = input.courses || []
  blocks.push({
    type: 'courses',
    content: {
      eyebrow: 'Kurse',
      title: 'Nächste Kurstermine',
      description:
        formal === 'du'
          ? 'VKU, Nothilfe und weitere Kurse — aktuell aus dem System.'
          : 'VKU, Nothilfe und weitere Kurse — aktuell aus dem System.',
      items: courses,
      cta_text: 'Alle Kurse',
      cta_url: input.tenant.slug
        ? `${input.bookingUrl.replace(/\/booking\/availability\/[^/?#]+.*$/, '')}/customer/courses/${encodeURIComponent(input.tenant.slug)}`.replace(
            /([^:]\/)\/+/g,
            '$1',
          )
        : input.bookingUrl,
    },
  })

  const gallery =
    input.gallery ||
    [
      input.tenant.hero_image_url
        ? { url: input.tenant.hero_image_url, alt: `${name} — Eindruck` }
        : null,
    ].filter(Boolean)
  if (gallery.length > 1) {
    blocks.push({
      type: 'gallery',
      content: {
        eyebrow: 'Einblicke',
        title: 'Galerie',
        description: city ? `${name} in ${city}` : name,
        images: gallery,
      },
    })
  }

  blocks.push({
    type: 'faq',
    content: {
      eyebrow: 'FAQ',
      title: 'Häufige Fragen',
      items: faqs,
    },
  })

  blocks.push({
    type: 'cta',
    content: {
      headline:
        formal === 'du'
          ? `Bereit für deine nächste ${t.appointment}?`
          : `Bereit für Ihre nächste ${t.appointment}?`,
      subheadline:
        formal === 'du'
          ? `Buche online — ${name} kümmert sich um den Rest.`
          : `Buchen Sie online — ${name} kümmert sich um den Rest.`,
      cta_text: t.bookAction,
      cta_url: input.bookingUrl,
      whatsapp_url: wa,
      whatsapp_text: 'WhatsApp',
    },
  })

  const legalBase = input.siteUrl.replace(/\/$/, '')
  const channels = {
    phone: input.contact_channels?.phone !== false,
    email: input.contact_channels?.email !== false,
    whatsapp: input.contact_channels?.whatsapp !== false,
    form: input.contact_channels?.form !== false,
  }
  blocks.push({
    type: 'contact',
    content: {
      title: 'Kontakt',
      name,
      email: channels.email ? email : null,
      phone: channels.phone ? phone : null,
      address: input.tenant.address || null,
      city: city || input.tenant.city || null,
      postal_code: input.tenant.postal_code || null,
      whatsapp_url: channels.whatsapp ? wa : null,
      channels,
      map_embed_url: mapEmbed,
      map_url: mapLink,
      hours: hoursRows,
      hours_title: 'Öffnungszeiten',
      form_enabled: channels.form,
      form_title: formal === 'du' ? 'Nachricht schreiben' : 'Nachricht schreiben',
      form_subtitle:
        formal === 'du'
          ? 'Kurz melden — wir antworten so rasch wie möglich.'
          : 'Kurz melden — wir antworten so rasch wie möglich.',
      impressum_url: `${legalBase}/impressum`,
      datenschutz_url: `${legalBase}/datenschutz`,
      legal_links: [
        { label: 'Impressum', href: `${legalBase}/impressum` },
        { label: 'Datenschutz', href: `${legalBase}/datenschutz` },
      ],
    },
  })

  // Strip WhatsApp from hero/cta when channel disabled
  if (!channels.whatsapp) {
    for (const type of ['hero', 'cta'] as const) {
      const idx = blocks.findIndex((b) => b.type === type)
      if (idx >= 0) blocks[idx].content.whatsapp_url = null
    }
  }

  const priced = services.filter((s) => s.price_cents != null && Number(s.price_cents) > 0)
  const minPrice = priced.length ? Math.min(...priced.map((s) => Number(s.price_cents))) : null
  const priceRange = minPrice != null ? `CHF ${Math.round(minPrice / 100)}+` : undefined

  const sameAs: string[] = []
  if (input.tenant.website_instagram) sameAs.push(String(input.tenant.website_instagram))
  if (input.tenant.website_facebook) sameAs.push(String(input.tenant.website_facebook))

  const geo =
    input.tenant.latitude != null && input.tenant.longitude != null
      ? {
          '@type': 'GeoCoordinates',
          latitude: Number(input.tenant.latitude),
          longitude: Number(input.tenant.longitude),
        }
      : undefined

  const reviewNodes = testimonials.slice(0, 5).map((tm, i) => ({
    '@type': 'Review',
    '@id': `${input.siteUrl}#review-${i + 1}`,
    author: { '@type': 'Person', name: tm.author },
    reviewBody: tm.text,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: tm.rating || 5,
      bestRating: 5,
    },
  }))

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': schemaBusinessType(input.tenant.business_type),
        '@id': `${input.siteUrl}#business`,
        name,
        description: seoDescription,
        url: input.siteUrl,
        telephone: phone || undefined,
        email: email || undefined,
        image: input.tenant.logo_url || input.tenant.hero_image_url || undefined,
        priceRange,
        areaServed: city
          ? [
              { '@type': 'City', name: city },
              { '@type': 'Country', name: 'Switzerland' },
            ]
          : { '@type': 'Country', name: 'Switzerland' },
        address: {
          '@type': 'PostalAddress',
          streetAddress: input.tenant.address || undefined,
          addressLocality: city || input.tenant.city || undefined,
          postalCode: input.tenant.postal_code || undefined,
          addressCountry: 'CH',
        },
        openingHoursSpecification: openingHoursToSchema(hoursTpl),
        ...(geo ? { geo, hasMap: mapLink || undefined } : mapLink ? { hasMap: mapLink } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(services.length
          ? {
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: `Angebot ${name}`,
                itemListElement: services.slice(0, 8).map((s, i) => ({
                  '@type': 'Offer',
                  position: i + 1,
                  itemOffered: {
                    '@type': 'Service',
                    name: s.name,
                    description: s.description,
                  },
                  ...(s.price_cents != null
                    ? {
                        price: (Number(s.price_cents) / 100).toFixed(2),
                        priceCurrency: 'CHF',
                      }
                    : {}),
                })),
              },
            }
          : {}),
        ...(rating
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: rating,
                reviewCount: Math.max(1, input.stats?.total_testimonials || testimonials.length || 1),
              },
            }
          : {}),
        ...(reviewNodes.length ? { review: reviewNodes } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${input.siteUrl}#website`,
        url: input.siteUrl,
        name,
        inLanguage: 'de-CH',
        publisher: { '@id': `${input.siteUrl}#business` },
        potentialAction: {
          '@type': 'ReserveAction',
          name: t.bookAction,
          target: {
            '@type': 'EntryPoint',
            urlTemplate: input.bookingUrl,
            actionPlatform: [
              'http://schema.org/DesktopWebPlatform',
              'http://schema.org/MobileWebPlatform',
            ],
            inLanguage: 'de-CH',
          },
          result: {
            '@type': 'Reservation',
            name: 'Online-Buchung',
          },
        },
      },
      {
        '@type': 'FAQPage',
        '@id': `${input.siteUrl}#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      ...courses.slice(0, 5).map((c, i) => ({
        '@type': 'Course',
        '@id': `${input.siteUrl}#course-${i + 1}`,
        name: c.title,
        provider: { '@id': `${input.siteUrl}#business` },
        ...(c.category ? { category: c.category } : {}),
        ...(c.price_chf != null
          ? {
              offers: {
                '@type': 'Offer',
                price: String(c.price_chf),
                priceCurrency: 'CHF',
                availability:
                  c.spots_left != null && c.spots_left <= 0
                    ? 'https://schema.org/SoldOut'
                    : 'https://schema.org/InStock',
                url: c.href || input.bookingUrl,
              },
            }
          : {}),
        ...(c.starts_at
          ? {
              hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'onsite',
                startDate: c.starts_at,
                ...(c.ends_at ? { endDate: c.ends_at } : {}),
                location: c.location
                  ? { '@type': 'Place', name: c.location }
                  : city
                    ? { '@type': 'Place', name: city }
                    : undefined,
              },
            }
          : {}),
      })),
      ...slots.slice(0, 5).map((s, i) => ({
        '@type': 'Event',
        '@id': `${input.siteUrl}#slot-${i + 1}`,
        name: `${s.label} — ${name}`,
        startDate: s.start_time,
        endDate: s.end_time,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        organizer: { '@id': `${input.siteUrl}#business` },
        offers: {
          '@type': 'Offer',
          url: s.book_url,
          availability: 'https://schema.org/InStock',
          priceCurrency: 'CHF',
        },
        url: s.book_url,
      })),
    ],
  }

  const template = input.template || pickTemplateVariant(input.tenant.id || name)

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
      hero_video_url: null,
      formal_address: formal,
      hero_image_source: input.hero_image_source || null,
      hero_attribution: input.hero_attribution || null,
      hide_powered_by: input.hide_powered_by !== false,
      template,
    },
    bookingUrl: input.bookingUrl,
    siteUrl: input.siteUrl,
    blocks,
    schema,
  }
}

function cityHint(tenant: LandingTenantInput) {
  return tenant.city?.trim() || null
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
