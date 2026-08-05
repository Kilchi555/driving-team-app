/** Shared JSON-LD builders for simy.ch */

export const SIMY_BASE = 'https://simy.ch'

export const SIMY_ORG: Record<string, unknown> = {
  '@type': 'Organization',
  '@id': `${SIMY_BASE}/#organization`,
  name: 'Simy IT Systems',
  url: SIMY_BASE,
  logo: {
    '@type': 'ImageObject',
    url: `${SIMY_BASE}/simy-logo.png`,
  },
  email: 'info@simy.ch',
  telephone: '+41-79-715-70-27',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Weiherweg 2',
    addressLocality: 'Uster',
    postalCode: '8610',
    addressCountry: 'CH',
  },
  areaServed: { '@type': 'Country', name: 'Switzerland' },
}

export const SIMY_WEBSITE: Record<string, unknown> = {
  '@type': 'WebSite',
  '@id': `${SIMY_BASE}/#website`,
  name: 'Simy',
  url: SIMY_BASE,
  inLanguage: 'de-CH',
  publisher: { '@id': `${SIMY_BASE}/#organization` },
  description:
    'Terminsoftware aus der Schweiz: Online-Buchung, Abrechnung, Kundenverwaltung und App für Selbständige und KMUs.',
}

export type BreadcrumbItem = { name: string; url: string }
export type FaqItem = { q: string; a: string }

/** Nuxt useHead script entries */
export function ldScripts(...nodes: Record<string, unknown>[]) {
  return nodes.filter(Boolean).map((node) => ({
    type: 'application/ld+json' as const,
    children: JSON.stringify({
      '@context': 'https://schema.org',
      ...node,
    }),
  }))
}

export function breadcrumbLd(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function webPageLd(opts: {
  name: string
  description: string
  url: string
  type?: string
}) {
  return {
    '@type': opts.type || 'WebPage',
    '@id': `${opts.url}#webpage`,
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'de-CH',
    isPartOf: { '@id': `${SIMY_BASE}/#website` },
    about: { '@id': `${SIMY_BASE}/#organization` },
  }
}

export function softwareAppLd(opts: {
  name: string
  description: string
  url: string
  price?: string | number
}) {
  return {
    '@type': 'SoftwareApplication',
    name: opts.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description: opts.description,
    url: opts.url,
    offers: {
      '@type': 'Offer',
      price: String(opts.price ?? 0),
      priceCurrency: 'CHF',
      description: '30 Tage kostenlos testen',
    },
    provider: { '@id': `${SIMY_BASE}/#organization` },
  }
}

export function faqPageLd(faqs: FaqItem[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
}

export function itemListLd(opts: {
  name: string
  description?: string
  url: string
  items: { name: string; url: string }[]
}) {
  return {
    '@type': 'CollectionPage',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: 'de-CH',
    isPartOf: { '@id': `${SIMY_BASE}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: opts.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: item.url,
      })),
    },
  }
}

export function productOffersLd(opts: {
  name: string
  description: string
  url: string
  plans: { name: string; price: number; description: string }[]
}) {
  return {
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    brand: { '@type': 'Brand', name: 'Simy' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'CHF',
      lowPrice: String(Math.min(...opts.plans.map((p) => p.price))),
      highPrice: String(Math.max(...opts.plans.map((p) => p.price))),
      offerCount: opts.plans.length,
      offers: opts.plans.map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: String(p.price),
        priceCurrency: 'CHF',
        description: p.description,
        url: opts.url,
        availability: 'https://schema.org/InStock',
        priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      })),
    },
  }
}

export function serviceLd(opts: {
  name: string
  description: string
  url: string
}) {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: { '@id': `${SIMY_BASE}/#organization` },
    areaServed: { '@type': 'Country', name: 'Switzerland' },
  }
}
