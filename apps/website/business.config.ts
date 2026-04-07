/**
 * ============================================================
 * SINGLE SOURCE OF TRUTH – Driving Team Fahrschule
 * ============================================================
 *
 * ⚠️  WICHTIG: Änderungen hier müssen MANUELL synchronisiert werden mit:
 *   1. Google Business Profile (GBP) – Zürich:  https://business.google.com
 *   2. Google Business Profile (GBP) – Lachen:  https://business.google.com
 *   3. Google Search Console:                   https://search.google.com/search-console
 *
 * Regel: Erst hier ändern → dann in BEIDEN GBP-Profilen aktualisieren.
 * ============================================================
 */

// ── Gemeinsame Marken-Daten (gelten für beide Standorte) ─────
export const BRAND = {
  name: 'Driving Team Fahrschule',
  shortName: 'Driving Team',
  legalName: 'Driving Team Fahrschule',
  foundingYear: 1994,
  website: 'https://drivingteam.ch',
  email: 'info@drivingteam.ch',
  logo: 'https://drivingteam.ch/logo.webp',
  ogImage: 'https://drivingteam.ch/images/og-image.webp',
  payment: {
    currencies: 'CHF',
    methods: 'Überweisung, Bar, Twint',
  },
  // Social Media ist marken-weit (nicht standortspezifisch)
  social: {
    instagramZuerich: 'https://www.instagram.com/fahrschule_driving_team_zurich/',
    instagramLachen: 'https://www.instagram.com/fahrschule_drivingteam_lachen',
    facebookZuerich: 'https://www.facebook.com/drivingteam',
    facebookLachen: 'https://www.facebook.com/drivingteamlachen/',
    youtube: 'https://www.youtube.com/channel/UC5nqMUHvHym4xW-ro1aX90Q',
    tiktok: 'https://www.tiktok.com/@drivingteam.ch',
  },
} as const

// ── Standort-Typ ─────────────────────────────────────────────
interface Location {
  id: string
  /** GBP-Profilname – muss 1:1 übereinstimmen */
  gbpName: string
  /**
   * Google Place ID – wird für die Places API verwendet.
   * Findest du so: maps.google.com → Dein Business suchen → Share → Link kopieren
   * Oder: https://developers.google.com/maps/documentation/places/web-service/place-id
   * Format: "ChIJ..." (beginnt immer mit ChIJ)
   */
  placeId: string
  address: {
  address: {
    street: string
    city: string
    district?: string
    zip: string
    canton: string
    country: string
  }
  geo: { lat: number; lng: number }
  phone: string
  phoneFormatted: string
  /** ⚠️  Muss mit GBP-Öffnungszeiten übereinstimmen */
  hours: {
    weekdays: { open: string; close: string }
    saturday: { open: string; close: string } | null
    sunday: null
  }
  hoursDisplay: string
  priceRange: string
  /** ⚠️  Aus Google Maps – periodisch aktualisieren */
  rating: { value: number; count: number; max: number }
  /** ⚠️  Muss exakt den gewählten GBP-Kategorien entsprechen */
  gbpCategories: { primary: string; secondary: string[] }
  /** Hauptdienstleistungen dieses Standorts mit URL */
  services: Array<{ name: string; url: string }>
  /** Einzugsgebiet für Schema areaServed */
  areaServed?: string[]
}

// ── Standort: Zürich ─────────────────────────────────────────
export const LOCATION_ZUERICH: Location = {
  id: 'zuerich',
  gbpName: 'Driving Team Fahrschule Zürich',
  placeId: 'ChIJU29cFMgLkEcRzMfDub2bh9s',

  address: {
    street: 'Baslerstrasse 145',
    city: 'Zürich',
    district: 'Zürich-Altstetten',
    zip: '8048',
    canton: 'ZH',
    country: 'CH',
  },
  geo: { lat: 47.3914, lng: 8.4897 },

  phone: '+41444310033',
  phoneFormatted: '044 431 00 33',

  hours: {
    weekdays: { open: '08:00', close: '18:00' },
    saturday: { open: '08:00', close: '14:00' },
    sunday: null,
  },
  hoursDisplay: 'Mo–Fr 08:00–18:00 · Sa 08:00–14:00',

  priceRange: 'CHF 95–170',

  rating: { value: 4.9, count: 366, max: 5 },

  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['LKW-Fahrschule', 'Motorradschule'],
  },

  services: [
    { name: 'Auto Fahrschule Zürich', url: 'https://drivingteam.ch/auto-fahrschule-zuerich/' },
    { name: 'Motorrad Fahrschule Zürich', url: 'https://drivingteam.ch/motorrad-fahrschule-zuerich/' },
    { name: 'Lastwagen Fahrschule Zürich', url: 'https://drivingteam.ch/lastwagen-fahrschule-zuerich/' },
    { name: 'Bus Fahrschule Zürich', url: 'https://drivingteam.ch/bus-fahrschule-zuerich/' },
    { name: 'Taxi Fahrschule Zürich', url: 'https://drivingteam.ch/taxi-fahrschule-zuerich/' },
    { name: 'Anhänger Fahrschule Zürich', url: 'https://drivingteam.ch/anhaenger-fahrschule-zuerich/' },
    { name: 'VKU Kurs Zürich', url: 'https://drivingteam.ch/vku-kurs-zuerich/' },
    { name: 'Nothelferkurs Zürich', url: 'https://drivingteam.ch/nothelferkurs-zuerich/' },
    { name: 'WAB Kurs Zürich', url: 'https://drivingteam.ch/wab-kurse-zuerich/' },
    { name: 'Motorboot Fahrschule Zürich', url: 'https://drivingteam.ch/motorboot-fahrschule/' },
  ],
}

// ── Standort: Lachen ─────────────────────────────────────────
export const LOCATION_LACHEN: Location = {
  id: 'lachen',
  gbpName: 'Driving Team Fahrschule Lachen',
  placeId: 'ChIJqdlnJXTJmkcRAgI05nvPXFU',

  address: {
    street: 'Herrengasse 17',
    city: 'Lachen',
    zip: '8853',
    canton: 'SZ',
    country: 'CH',
  },
  geo: { lat: 47.1994, lng: 8.8534 },

  phone: '+41554420041',
  phoneFormatted: '055 442 00 41',

  hours: {
    weekdays: { open: '08:00', close: '18:00' },
    saturday: { open: '08:00', close: '12:00' },
    sunday: null,
  },
  hoursDisplay: 'Mo–Fr 08:00–18:00 · Sa 08:00–12:00',

  priceRange: 'CHF 95–170',

  rating: { value: 4.8, count: 87, max: 5 },

  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['Motorradschule', 'Nothelferkurs'],
  },

  services: [
    { name: 'Auto Fahrschule Lachen', url: 'https://drivingteam.ch/driving-school-lachen/' },
    { name: 'Motorrad Grundkurs Lachen', url: 'https://drivingteam.ch/motorrad-grundkurs-lachen/' },
    { name: 'Nothelferkurs Lachen', url: 'https://drivingteam.ch/nothelferkurs-lachen/' },
    { name: 'WAB Kurs Schwyz', url: 'https://drivingteam.ch/wab-kurse-schwyz/' },
    { name: 'Anhänger Fahrschule Lachen', url: 'https://drivingteam.ch/anhaenger-pruefung-lachen/' },
  ],
}

// ── Standort: Pfäffikon SZ ───────────────────────────────────
export const LOCATION_PFAEFFIKON: Location = {
  id: 'pfaeffikon',
  gbpName: 'Fahrschule Pfäffikon SZ - Driving Team',
  // Place ID nach GBP-Erstellung eintragen
  placeId: '',

  address: {
    street: 'Hofacker 2',
    city: 'Pfäffikon',
    zip: '8808',
    canton: 'SZ',
    country: 'CH',
  },
  geo: { lat: 47.2091, lng: 8.7823 },

  phone: '+41444310033',
  phoneFormatted: '044 431 00 33',

  hours: {
    weekdays: { open: '07:00', close: '20:00' },
    saturday: { open: '08:00', close: '17:00' },
    sunday: null,
  },
  hoursDisplay: 'Mo–Fr 07:00–20:00 · Sa 08:00–17:00',

  priceRange: 'CHF 95–170',

  rating: { value: 4.9, count: 30, max: 5 },

  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['Motorradschule'],
  },

  services: [
    { name: 'Auto Fahrschule Pfäffikon SZ', url: 'https://drivingteam.ch/fahrschule-pfaeffikon-sz/' },
    { name: 'Motorrad Fahrschule', url: 'https://drivingteam.ch/motorrad-fahrschule/' },
    { name: 'Anhänger Fahrschule', url: 'https://drivingteam.ch/anhaenger-fahrschule/' },
    { name: 'WAB Kurse', url: 'https://drivingteam.ch/wab-kurse-zuerich/' },
    { name: 'Nothelferkurs', url: 'https://drivingteam.ch/nothelferkurs/' },
  ],

  areaServed: ['Pfäffikon SZ', 'Freienbach', 'Wollerau', 'Feusisberg', 'Schindellegi', 'Altendorf', 'Lachen', 'Wädenswil', 'Rapperswil-Jona', 'Bezirk Höfe', 'Ausserschwyz'],
}

// ── Standort: Spreitenbach (GBP: "Fahrschule Aargau – Driving Team") ──
export const LOCATION_SPREITENBACH: Location = {
  id: 'spreitenbach',
  gbpName: 'Fahrschule Aargau - Driving Team - Auto - Anhänger',
  placeId: 'ChIJ_V8A6ycNkEcRz6hXDJMr6ls',

  address: {
    street: 'Haldenstrasse 13',
    city: 'Spreitenbach',
    zip: '8957',
    canton: 'AG',
    country: 'CH',
  },
  geo: { lat: 47.4188, lng: 8.3610 },

  phone: '+41444310033',
  phoneFormatted: '044 431 00 33',

  hours: {
    weekdays: { open: '08:00', close: '18:00' },
    saturday: { open: '08:00', close: '14:00' },
    sunday: null,
  },
  hoursDisplay: 'Mo–Fr 08:00–18:00 · Sa 08:00–14:00',

  priceRange: 'CHF 95–170',

  rating: { value: 4.9, count: 25, max: 5 },

  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['Anhänger Fahrschule'],
  },

  services: [
    { name: 'Auto Fahrschule Spreitenbach', url: 'https://drivingteam.ch/fahrschule-spreitenbach/' },
    { name: 'Anhänger Fahrschule Zürich', url: 'https://drivingteam.ch/anhaenger-fahrschule-zuerich/' },
    { name: 'VKU Kurs Zürich', url: 'https://drivingteam.ch/vku-kurs-zuerich/' },
    { name: 'Nothelferkurs Zürich', url: 'https://drivingteam.ch/nothelferkurs-zuerich/' },
  ],
}

// ── Standort: Uster ──────────────────────────────────────────
export const LOCATION_USTER: Location = {
  id: 'uster',
  gbpName: 'Fahrschule Uster - Driving Team - Auto - Motorrad - Motorboot',
  placeId: 'ChIJtRgKpBClmkcRxXQxbtz0uBA',

  address: {
    street: 'Weiherweg 2',
    city: 'Uster',
    zip: '8610',
    canton: 'ZH',
    country: 'CH',
  },
  geo: { lat: 47.3469, lng: 8.7178 },

  phone: '+41444310033',
  phoneFormatted: '044 431 00 33',

  hours: {
    weekdays: { open: '08:00', close: '18:00' },
    saturday: { open: '08:00', close: '14:00' },
    sunday: null,
  },
  hoursDisplay: 'Mo–Fr 08:00–18:00 · Sa 08:00–14:00',

  priceRange: 'CHF 95–170',

  rating: { value: 4.9, count: 20, max: 5 },

  gbpCategories: {
    primary: 'Fahrschule',
    secondary: ['Motorradschule', 'Motorbootfahrschule'],
  },

  services: [
    { name: 'Auto Fahrschule Uster', url: 'https://drivingteam.ch/fahrschule-uster/' },
    { name: 'Motorrad Fahrschule', url: 'https://drivingteam.ch/motorrad-fahrschule/' },
    { name: 'Motorboot Fahrschule', url: 'https://drivingteam.ch/motorboot-fahrschule/' },
    { name: 'VKU Kurs Zürich', url: 'https://drivingteam.ch/vku-kurs-zuerich/' },
    { name: 'Nothelferkurs Zürich', url: 'https://drivingteam.ch/nothelferkurs-zuerich/' },
  ],
}

// ── Alle Standorte als Array (für Loops) ─────────────────────
export const ALL_LOCATIONS = [LOCATION_ZUERICH, LOCATION_LACHEN, LOCATION_SPREITENBACH, LOCATION_USTER, LOCATION_PFAEFFIKON] as const

// ── Rückwärtskompatibilität: BUSINESS zeigt auf Hauptstandort ─
// (wird in index.vue und default.vue verwendet)
export const BUSINESS = {
  name: BRAND.name,
  shortName: BRAND.shortName,
  foundingYear: BRAND.foundingYear,
  website: BRAND.website,
  email: BRAND.email,
  logo: BRAND.logo,
  ogImage: BRAND.ogImage,
  payment: BRAND.payment,
  social: BRAND.social,
  // Hauptstandort-Daten (Zürich)
  phone: LOCATION_ZUERICH.phone,
  phoneFormatted: LOCATION_ZUERICH.phoneFormatted,
  address: LOCATION_ZUERICH.address,
  geo: LOCATION_ZUERICH.geo,
  hours: LOCATION_ZUERICH.hours,
  hoursDisplay: LOCATION_ZUERICH.hoursDisplay,
  priceRange: LOCATION_ZUERICH.priceRange,
  rating: LOCATION_ZUERICH.rating,
}

// ── Schema-Builder: Homepage (Hauptstandort) ─────────────────
export function buildHomepageSchema() {
  const loc = LOCATION_ZUERICH
  return {
    '@context': 'https://schema.org',
    '@type': ['DrivingSchool', 'LocalBusiness'],
    '@id': `${BRAND.website}/#drivingschool`,
    name: BRAND.name,
    alternateName: BRAND.shortName,
    url: BRAND.website,
    logo: { '@type': 'ImageObject', url: BRAND.logo },
    image: BRAND.ogImage,
    description: `Professionelle Fahrschule in Zürich-Altstetten & Lachen SZ – Auto, Motorrad, Lastwagen, Bus, Taxi, Anhänger und Motorboot. Eidgenössisch diplomierte Fahrlehrer seit ${BRAND.foundingYear}.`,
    foundingDate: String(BRAND.foundingYear),
    telephone: loc.phone,
    email: BRAND.email,
    priceRange: loc.priceRange,
    currenciesAccepted: BRAND.payment.currencies,
    paymentAccepted: BRAND.payment.methods,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.address.street,
      addressLocality: loc.address.city,
      addressRegion: loc.address.canton,
      postalCode: loc.address.zip,
      addressCountry: loc.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: loc.geo.lat, longitude: loc.geo.lng },
    openingHoursSpecification: buildOpeningHours(loc),
    areaServed: [
      { '@type': 'City', name: 'Zürich' },
      { '@type': 'City', name: 'Lachen' },
      { '@type': 'City', name: 'Uster' },
      { '@type': 'City', name: 'Dietikon' },
      { '@type': 'City', name: 'Schlieren' },
      { '@type': 'AdministrativeArea', name: 'Kanton Zürich' },
      { '@type': 'AdministrativeArea', name: 'Kanton Schwyz' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Fahrausbildung Driving Team',
      itemListElement: loc.services.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, url: s.url },
      })),
    },
    aggregateRating: buildRating(loc),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      telephone: loc.phone,
      email: BRAND.email,
      availableLanguage: ['German', 'English'],
    },
    sameAs: Object.values(BRAND.social),
  }
}

// ── Schema-Builder: Standort-Seite (z.B. driving-school-lachen) ─
export function buildLocationSchema(loc: Location) {
  return {
    '@context': 'https://schema.org',
    '@type': ['DrivingSchool', 'LocalBusiness'],
    '@id': `${BRAND.website}/#drivingschool-${loc.id}`,
    name: loc.gbpName,
    parentOrganization: { '@type': 'Organization', name: BRAND.name, url: BRAND.website },
    url: BRAND.website,
    logo: { '@type': 'ImageObject', url: BRAND.logo },
    telephone: loc.phone,
    email: BRAND.email,
    priceRange: loc.priceRange,
    currenciesAccepted: BRAND.payment.currencies,
    paymentAccepted: BRAND.payment.methods,
    address: {
      '@type': 'PostalAddress',
      streetAddress: loc.address.street,
      addressLocality: loc.address.city,
      addressRegion: loc.address.canton,
      postalCode: loc.address.zip,
      addressCountry: loc.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: loc.geo.lat, longitude: loc.geo.lng },
    openingHoursSpecification: buildOpeningHours(loc),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `Fahrausbildung ${loc.address.city}`,
      itemListElement: loc.services.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: s.name, url: s.url },
      })),
    },
    ...(loc.areaServed && {
      areaServed: loc.areaServed.map(name => ({ '@type': 'City', name })),
    }),
    aggregateRating: buildRating(loc),
    sameAs: Object.values(BRAND.social),
  }
}

// ── Hilfsfunktionen ──────────────────────────────────────────
function buildOpeningHours(loc: Location) {
  const specs = [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: loc.hours.weekdays.open,
      closes: loc.hours.weekdays.close,
    },
  ]
  if (loc.hours.saturday) {
    specs.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday'] as unknown as string[],
      opens: loc.hours.saturday.open,
      closes: loc.hours.saturday.close,
    })
  }
  return specs
}

function buildRating(loc: Location) {
  return {
    '@type': 'AggregateRating',
    ratingValue: String(loc.rating.value),
    bestRating: String(loc.rating.max),
    worstRating: '1',
    reviewCount: String(loc.rating.count),
  }
}
