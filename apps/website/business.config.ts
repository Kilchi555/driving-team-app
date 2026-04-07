/**
 * ============================================================
 * SINGLE SOURCE OF TRUTH – Driving Team Fahrschule
 * ============================================================
 *
 * ⚠️  WICHTIG: Änderungen hier müssen MANUELL synchronisiert werden mit:
 *   1. Google Business Profile (GBP):    https://business.google.com
 *   2. Google Search Console:            https://search.google.com/search-console
 *   3. Yelp, Local.ch, Search.ch etc.    (falls vorhanden)
 *
 * Regel: Erst hier ändern → dann im GBP aktualisieren.
 * ============================================================
 */

export const BUSINESS = {
  // ── Identität ──────────────────────────────────────────────
  name: 'Driving Team Fahrschule',
  shortName: 'Driving Team',
  legalName: 'Driving Team Fahrschule',
  foundingYear: 1994,
  tagline: 'Professionelle Fahrschule in Zürich & Lachen SZ',

  // ── Kontakt ────────────────────────────────────────────────
  phone: '+41444310033',
  phoneFormatted: '+41 44 431 00 33',
  email: 'info@drivingteam.ch',
  website: 'https://drivingteam.ch',

  // ── Hauptstandort (Zürich) ──────────────────────────────────
  // ⚠️  Muss 1:1 mit GBP übereinstimmen – inkl. Schreibweise!
  address: {
    street: 'Baslerstrasse 145',
    city: 'Zürich',
    district: 'Zürich-Altstetten',
    zip: '8048',
    canton: 'ZH',
    country: 'CH',
    countryFull: 'Schweiz',
  },

  // ── Geo-Koordinaten (aus Google Maps) ──────────────────────
  geo: {
    lat: 47.3914,
    lng: 8.4897,
  },

  // ── Zweitstandort Lachen ────────────────────────────────────
  branchLachen: {
    name: 'Driving Team Fahrschule Lachen',
    city: 'Lachen',
    canton: 'SZ',
    zip: '8853',
    country: 'CH',
  },

  // ── Öffnungszeiten ──────────────────────────────────────────
  // ⚠️  Muss mit GBP-Öffnungszeiten übereinstimmen!
  hours: {
    weekdays: { open: '08:00', close: '18:00' },
    saturday: { open: '08:00', close: '14:00' },
    sunday: null, // geschlossen
  },
  hoursDisplay: 'Mo–Fr 08:00–18:00 · Sa 08:00–14:00',

  // ── Preise (für Schema priceRange) ─────────────────────────
  priceRange: 'CHF 95–170',
  priceRangeSymbol: '$$',

  // ── Bewertungen (aus Google, periodisch aktualisieren) ──────
  // ⚠️  Manuell aktualisieren wenn sich Google-Bewertungen ändern
  rating: {
    value: 4.9,
    count: 366,
    max: 5,
  },

  // ── Social Media ───────────────────────────────────────────
  social: {
    instagramZuerich: 'https://www.instagram.com/fahrschule_driving_team_zurich/',
    instagramLachen: 'https://www.instagram.com/fahrschule_drivingteam_lachen',
    facebookZuerich: 'https://www.facebook.com/drivingteam',
    facebookLachen: 'https://www.facebook.com/drivingteamlachen/',
    youtube: 'https://www.youtube.com/channel/UC5nqMUHvHym4xW-ro1aX90Q',
    tiktok: 'https://www.tiktok.com/@drivingteam.ch',
  },

  // ── GBP Kategorien ─────────────────────────────────────────
  // ⚠️  Muss exakt den gewählten GBP-Kategorien entsprechen
  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['LKW-Fahrschule', 'Motorradschule'],
  },

  // ── Assets ─────────────────────────────────────────────────
  logo: 'https://drivingteam.ch/logo.webp',
  ogImage: 'https://drivingteam.ch/images/og-image.webp',

  // ── Zahlungsmethoden ───────────────────────────────────────
  payment: {
    currencies: 'CHF',
    methods: 'Überweisung, Bar, Twint',
  },
} as const

// ── Schema.org JSON-LD für Homepage ──────────────────────────
export function buildHomepageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': ['DrivingSchool', 'LocalBusiness'],
    '@id': `${BUSINESS.website}/#drivingschool`,
    name: BUSINESS.name,
    alternateName: BUSINESS.shortName,
    url: BUSINESS.website,
    logo: {
      '@type': 'ImageObject',
      url: BUSINESS.logo,
    },
    image: BUSINESS.ogImage,
    description: `${BUSINESS.tagline} – Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger und Motorboot. Eidgenössisch diplomierte Fahrlehrer seit ${BUSINESS.foundingYear}.`,
    foundingDate: String(BUSINESS.foundingYear),
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    priceRange: BUSINESS.priceRange,
    currenciesAccepted: BUSINESS.payment.currencies,
    paymentAccepted: BUSINESS.payment.methods,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.canton,
      postalCode: BUSINESS.address.zip,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.lat,
      longitude: BUSINESS.geo.lng,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: BUSINESS.hours.weekdays.open,
        closes: BUSINESS.hours.weekdays.close,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: BUSINESS.hours.saturday.open,
        closes: BUSINESS.hours.saturday.close,
      },
    ],
    areaServed: [
      { '@type': 'City', name: 'Zürich' },
      { '@type': 'City', name: 'Lachen' },
      { '@type': 'City', name: 'Uster' },
      { '@type': 'City', name: 'Dietikon' },
      { '@type': 'City', name: 'Schlieren' },
      { '@type': 'AdministrativeArea', name: 'Kanton Zürich' },
      { '@type': 'AdministrativeArea', name: 'Kanton Schwyz' },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(BUSINESS.rating.value),
      bestRating: String(BUSINESS.rating.max),
      worstRating: '1',
      reviewCount: String(BUSINESS.rating.count),
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: BUSINESS.phone,
      email: BUSINESS.email,
      availableLanguage: ['German', 'English'],
    },
    sameAs: Object.values(BUSINESS.social),
  }
}
