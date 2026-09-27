/**
 * Reads one public page. Facts come from title, meta, Open Graph, and JSON-LD.
 * Visible copy is not mined for phones, prices, or hours.
 */
import { safeFetchPublic, type DnsLookup, type PinnedResponse } from '~/server/utils/ssrf-guard'

export const FACTORY_MAX_SERVICES = 12
export const FACTORY_MAX_IMAGES = 6
export const FACTORY_MAX_DESCRIPTION = 600

export type WebsiteExtract = {
  pageUrl: string
  title: string | null
  siteName: string | null
  description: string | null
  canonicalUrl: string | null
  businessName: string | null
  businessTypes: string[]
  city: string | null
  address: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  services: Array<{ name: string; description: string; priceCents: number | null }>
  openingHours: Array<{ day: string; opens: string; closes: string }>
  logoUrl: string | null
  imageUrls: string[]
  sameAs: string[]
  inferredCity: string | null
}

const CITY_HINTS = [
  'Zürich', 'Zurich', 'Bern', 'Basel', 'Luzern', 'Lucerne', 'St. Gallen', 'Winterthur',
  'Lausanne', 'Genf', 'Genève', 'Geneva', 'Lugano', 'Biel', 'Thun', 'Köniz', 'Chur',
  'Schaffhausen', 'Freiburg', 'Fribourg', 'Neuenburg', 'Neuchâtel', 'Zug', 'Aarau',
]

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&lt;': '<',
  '&gt;': '>',
}

/** Decode each entity once. A second pass would turn `&amp;lt;` into a real tag. */
function decodeHtmlEntitiesOnce(value: string): string {
  return value.replace(
    /&(?:amp|quot|#39|apos|lt|gt);/gi,
    (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? entity,
  )
}

function clean(value: unknown, max: number): string | null {
  const text = decodeHtmlEntitiesOnce(String(value || ''))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text) return null
  return text.slice(0, max)
}

function meta(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${key}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return clean(match[1], 500)
  }
  return null
}

function absUrl(value: string | null, base: string): string | null {
  if (!value) return null
  try {
    const url = new URL(value, base)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.toString().slice(0, 2000)
  } catch {
    return null
  }
}

function publicHttpsUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal') || host.includes(':')) return null
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null
    return url.toString().slice(0, 2000)
  } catch {
    return null
  }
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function typeNames(value: unknown): string[] {
  return asArray(value as string | string[]).map((item) => String(item || '')).filter(Boolean)
}

function walkJsonLd(node: unknown, visit: (row: Record<string, unknown>) => void, depth = 0) {
  if (!node || depth > 6) return
  if (Array.isArray(node)) {
    for (const item of node.slice(0, 40)) walkJsonLd(item, visit, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  const row = node as Record<string, unknown>
  visit(row)
  if (row['@graph']) walkJsonLd(row['@graph'], visit, depth + 1)
  for (const key of ['mainEntity', 'about', 'provider', 'address', 'hasOfferCatalog', 'itemListElement', 'makesOffer', 'openingHoursSpecification']) {
    if (row[key]) walkJsonLd(row[key], visit, depth + 1)
  }
}

function priceCents(value: unknown): number | null {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) return null
  return Math.round(amount * 100)
}

function phoneOk(value: string | null): string | null {
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return value.slice(0, 30)
}

function emailOk(value: string | null): string | null {
  if (!value) return null
  const email = value.trim().toLowerCase()
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function inferCityCandidate(text: string | null): string | null {
  const source = String(text || '')
  if (!source) return null
  for (const city of CITY_HINTS) {
    const pattern = new RegExp(`\\b${city.replace('.', '\\.')}\\b`, 'i')
    if (pattern.test(source)) return city === 'Zurich' ? 'Zürich' : city === 'Geneva' ? 'Genf' : city === 'Lucerne' ? 'Luzern' : city
  }
  return null
}

export function extractBusinessFromHtml(html: string, pageUrl: string): WebsiteExtract {
  const limited = String(html || '').slice(0, 512 * 1024)
  const title = clean((limited.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], 180)
  const description = meta(limited, 'description') || meta(limited, 'og:description')
  const siteName = meta(limited, 'og:site_name')
  const canonical = absUrl(meta(limited, 'og:url') || (limited.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || null, pageUrl)
  const ogImage = publicHttpsUrl(absUrl(meta(limited, 'og:image'), pageUrl))

  const extracted: WebsiteExtract = {
    pageUrl,
    title,
    siteName,
    description: description ? description.slice(0, FACTORY_MAX_DESCRIPTION) : null,
    canonicalUrl: canonical,
    businessName: null,
    businessTypes: [],
    city: null,
    address: null,
    postalCode: null,
    phone: null,
    email: null,
    services: [],
    openingHours: [],
    logoUrl: null,
    imageUrls: ogImage ? [ogImage] : [],
    sameAs: [],
    inferredCity: inferCityCandidate(`${title || ''} ${description || ''}`),
  }

  const scripts = [...limited.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].slice(0, 8)
  for (const script of scripts) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script[1].slice(0, 100000))
    } catch {
      continue
    }
    walkJsonLd(parsed, (row) => {
      const types = typeNames(row['@type']).map((item) => item.toLowerCase())
      if (types.some((item) => /localbusiness|organization|professionalservice|store|drivingschool|medicalbusiness/.test(item))) {
        extracted.businessName = extracted.businessName || clean(row.name, 120)
        extracted.businessTypes.push(...types)
        const logo = publicHttpsUrl(absUrl(typeof row.logo === 'string' ? row.logo : (row.logo as { url?: string })?.url || null, pageUrl))
        if (logo) extracted.logoUrl = extracted.logoUrl || logo
        const image = publicHttpsUrl(absUrl(typeof row.image === 'string' ? row.image : null, pageUrl))
        if (image) extracted.imageUrls.push(image)
        extracted.phone = extracted.phone || phoneOk(clean(row.telephone, 40))
        extracted.email = extracted.email || emailOk(clean(row.email, 120))
        extracted.description = extracted.description || clean(row.description, FACTORY_MAX_DESCRIPTION)
        for (const link of asArray(row.sameAs as string | string[])) {
          const href = publicHttpsUrl(absUrl(String(link || ''), pageUrl))
          if (href) extracted.sameAs.push(href)
        }
      }
      if (types.includes('postaladdress') || row.addressLocality || row.streetAddress) {
        extracted.city = extracted.city || clean(row.addressLocality, 80)
        extracted.postalCode = extracted.postalCode || clean(row.postalCode, 12)
        extracted.address = extracted.address || clean(row.streetAddress, 160)
      }
      if (types.some((item) => item === 'service' || item === 'offer' || item.endsWith('service'))) {
        const name = clean(row.name, 80)
        if (name && extracted.services.length < FACTORY_MAX_SERVICES) {
          const offer = (row.offers || {}) as { price?: unknown }
          extracted.services.push({
            name,
            description: clean(row.description, 180) || '',
            priceCents: priceCents(row.price ?? offer.price),
          })
        }
      }
      if (types.includes('openinghoursspecification')) {
        const day = clean(row.dayOfWeek, 40)
        const opens = clean(row.opens, 8)
        const closes = clean(row.closes, 8)
        if (day && opens && closes && extracted.openingHours.length < 14) {
          extracted.openingHours.push({ day, opens, closes })
        }
      }
    })
  }

  if (!extracted.email) {
    const mailto = limited.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)
    extracted.email = emailOk(mailto?.[1] || null)
  }
  if (!extracted.phone) {
    const tel = limited.match(/tel:(\+?[0-9][0-9\s().-]{7,20})/i)
    extracted.phone = phoneOk(clean(tel?.[1], 30))
  }
  extracted.businessName = extracted.businessName || siteName || null
  extracted.imageUrls = [...new Set(extracted.imageUrls)].slice(0, FACTORY_MAX_IMAGES)
  extracted.sameAs = [...new Set(extracted.sameAs)].slice(0, 8)
  extracted.services = extracted.services.slice(0, FACTORY_MAX_SERVICES)
  return extracted
}

export async function fetchWebsiteExtract(
  rawUrl: string,
  deps: {
    lookup?: DnsLookup
    request?: (url: URL, ip: string, maxBytes: number) => Promise<PinnedResponse>
  } = {},
): Promise<WebsiteExtract> {
  const fetched = await safeFetchPublic(rawUrl, deps)
  return extractBusinessFromHtml(fetched.body, fetched.finalUrl)
}
