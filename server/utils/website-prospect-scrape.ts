import type { ProspectScrape } from '~/server/utils/website-prospect-types'

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|::1|\[::|172\.(1[6-9]|2\d|3[0-1])\.)/i
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(?:\+41|0041|0)\s?(?:7[5-9]|2[1-9]|3[1-9]|4[1-9]|5[1-9]|6[1-9]|8[1-9]|9[1-9])[\s./-]?(?:\d[\s./-]?){6,8}\d/g
const HEX_RE = /#([0-9a-fA-F]{6})\b/

const CMS_HINTS: Array<[RegExp, string]> = [
  [/wp-content|wordpress/i, 'WordPress'],
  [/jimdo/i, 'Jimdo'],
  [/wix\.com|wixstatic/i, 'Wix'],
  [/squarespace/i, 'Squarespace'],
  [/webflow/i, 'Webflow'],
  [/jimdosite|jimdo-dolce/i, 'Jimdo'],
  [/shopify/i, 'Shopify'],
  [/weebly/i, 'Weebly'],
  [/ionos|1und1/i, 'IONOS'],
  [/typo3/i, 'TYPO3'],
  [/joomla/i, 'Joomla'],
]

const SERVICE_KEYWORDS = [
  { re: /\bkat(?:egorie)?\.?\s*be\b|anhänger/i, name: 'Anhänger Kat. BE' },
  { re: /\bkat(?:egorie)?\.?\s*b\b|autofahren|personenwagen|fahrlektion/i, name: 'Autofahren Kat. B' },
  { re: /\bkat(?:egorie)?\.?\s*a1\b|motorrad.*a1/i, name: 'Motorrad Kat. A1' },
  { re: /\bmotorrad|kat(?:egorie)?\.?\s*a\b/i, name: 'Motorrad' },
  { re: /\blastwagen|kat(?:egorie)?\.?\s*c1\b|\bkat(?:egorie)?\.?\s*c\b/i, name: 'Lastwagen' },
  { re: /\bbus|kat(?:egorie)?\.?\s*d\b/i, name: 'Bus' },
  { re: /\bvku|verkehrskunde/i, name: 'VKU' },
  { re: /\bwab\b/i, name: 'WAB' },
  { re: /\bnothelfer/i, name: 'Nothelferkurs' },
  { re: /\btaxi/i, name: 'Taxi' },
  { re: /\bcZV|weiterbildung berufschauffeur/i, name: 'CZV' },
]

const BOOKING_RE = /online\s*buchen|termin\s*buchen|jetzt\s*buchen|platz\s*sichern|calendly|simplybook|bookly|terminland/i

export function normalizeProspectUrl(raw: string): string | null {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return null
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withProto)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (PRIVATE_HOST.test(url.hostname)) return null
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname) && PRIVATE_HOST.test(url.hostname)) return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function hostnameFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

export function inferBusinessType(text: string, placeTypes: string[] = []): string {
  const blob = `${text} ${placeTypes.join(' ')}`.toLowerCase()
  if (/fahrschule|driving.?school|fahrlektion|fahrlehrer/.test(blob)) return 'driving_school'
  if (/hundeschule|hundetrain/.test(blob)) return 'dog_training'
  if (/musikschule|musikunterricht/.test(blob)) return 'music_school'
  if (/nachhilfe|tutoring/.test(blob)) return 'tutoring'
  if (/massage|physiotherap/.test(blob)) return 'massage'
  if (/fitness|personal.?train/.test(blob)) return 'fitness'
  if (/therapie|psycholog/.test(blob)) return 'therapy'
  if (/coach|mental/.test(blob)) return 'mental_coach'
  if (/berat|consult/.test(blob)) return 'consulting'
  return 'generic'
}

function decodeEntities(input: string) {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function meta(html: string, names: string[]) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      'i',
    )
    const alt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`,
      'i',
    )
    const m = html.match(re) || html.match(alt)
    if (m?.[1]) return decodeEntities(m[1].trim())
  }
  return null
}

function attr(html: string, tagRe: RegExp) {
  const m = html.match(tagRe)
  return m?.[1] ? decodeEntities(m[1].trim()) : null
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
}

function detectCms(html: string, generator: string | null): string | null {
  if (generator) {
    const g = generator.toLowerCase()
    if (g.includes('wordpress')) return 'WordPress'
    if (g.includes('wix')) return 'Wix'
    if (g.includes('jimdo')) return 'Jimdo'
    if (g.includes('squarespace')) return 'Squarespace'
    if (g.includes('webflow')) return 'Webflow'
  }
  for (const [re, label] of CMS_HINTS) {
    if (re.test(html)) return label
  }
  return generator
}

const JUNK_IMAGE =
  /favicon|sprite|pixel|tracking|1x1|emoji|gravatar|facebook\.com\/tr|google-analytics|doubleclick|\.svg($|\?)|data:image\/svg|apple-touch-icon|mstile|android-chrome/i

export function absolutizeUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

const SKIP_PATH = /impressum|datenschutz|privacy|agb|cookie|login|cart|warenkorb|wp-admin|feed|sitemap/i

export function extractInternalPaths(html: string, finalUrl: string): string[] {
  let host = ''
  try {
    host = new URL(finalUrl).host.replace(/^www\./i, '')
  } catch {
    return []
  }
  const paths = new Set<string>()
  for (const m of html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)) {
    let href = m[1]
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue
    try {
      const url = new URL(href, finalUrl)
      if (url.host.replace(/^www\./i, '') !== host) continue
      const path = url.pathname.replace(/\/+$/, '') || '/'
      if (path === '/') continue
      if (SKIP_PATH.test(path)) continue
      if (/\.(pdf|jpg|png|webp|zip)$/i.test(path)) continue
      paths.add(path)
    } catch {
      /* ignore */
    }
  }
  return [...paths].slice(0, 24)
}

export function extractPageImages(html: string, finalUrl: string): { logo: string | null; images: string[] } {
  const images: string[] = []
  let logo: string | null = null
  const seen = new Set<string>()
  const push = (raw: string | null, asLogo = false) => {
    const abs = absolutizeUrl(raw, finalUrl)
    if (!abs || JUNK_IMAGE.test(abs) || seen.has(abs)) return
    seen.add(abs)
    if (asLogo && !logo) logo = abs
    else images.push(abs)
  }

  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const tag = m[1] || ''
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1]
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1] || ''
    const cls = tag.match(/\bclass=["']([^"']*)["']/i)?.[1] || ''
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0)
    const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 0)
    if (w && h && (w < 80 || h < 80)) continue
    const isLogo = /logo/i.test(`${src} ${alt} ${cls}`)
    push(src || null, isLogo)
  }
  return { logo, images: images.slice(0, 12) }
}

function extractServices(text: string, html: string) {
  const out: ProspectScrape['services'] = []
  const seen = new Set<string>()
  const push = (name: string, source: ProspectScrape['services'][number]['source']) => {
    const key = name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push({ name, source })
  }
  for (const item of SERVICE_KEYWORDS) {
    if (item.re.test(text)) push(item.name, 'keyword')
  }
  const nav = html.match(/<nav[\s\S]*?<\/nav>/gi)?.join(' ') || ''
  for (const m of nav.matchAll(/>([^<]{3,48})</g)) {
    const label = decodeEntities(m[1]).replace(/\s+/g, ' ').trim()
    if (SERVICE_KEYWORDS.some((s) => s.re.test(label))) push(label, 'nav')
  }
  return out.slice(0, 10)
}

export function parseProspectHtml(htmlRaw: string, finalUrl: string): ProspectScrape {
  const html = String(htmlRaw || '').slice(0, 450_000)
  const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const h1 = attr(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const description = meta(html, ['description', 'og:description'])
  const canonical = attr(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
  const robots = meta(html, ['robots'])
  const viewport = /<meta[^>]+name=["']viewport["']/i.test(html)
  const hasOg = /property=["']og:(title|image|description)["']/i.test(html)
  const hasSchema = /application\/ld\+json/i.test(html) || /itemtype=["']https?:\/\/schema\.org/i.test(html)
  const generator = meta(html, ['generator'])
  const theme = meta(html, ['theme-color']) || html.match(HEX_RE)?.[0] || null
  const yearMatch = html.match(/(?:©|&copy;|copyright)\s*(20\d{2})/i)
  const copyrightYear = yearMatch ? Number(yearMatch[1]) : null
  const text = stripTags(html)
  const emails = [...new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase()))]
    .filter((e) => !/noreply|no-reply|example\.|sentry|wixpress|wordpress@/.test(e))
    .slice(0, 5)
  const phones = [...new Set((html.match(PHONE_RE) || []).map((p) => p.replace(/\s+/g, ' ').trim()))].slice(0, 4)
  const fromImgs = extractPageImages(html, finalUrl)
  const logo = fromImgs.logo || meta(html, ['og:logo'])
  const hero = meta(html, ['og:image', 'twitter:image'])

  return {
    final_url: finalUrl,
    title: title ? stripTags(title).slice(0, 140) : null,
    description: description?.slice(0, 300) || null,
    h1: h1 ? stripTags(h1).slice(0, 140) : null,
    canonical,
    robots,
    viewport,
    has_og: hasOg,
    has_schema: hasSchema,
    generator,
    copyright_year: copyrightYear,
    emails,
    phones,
    services: extractServices(text, html),
    logo_url: absolutizeUrl(logo, finalUrl),
    hero_image_url: absolutizeUrl(hero, finalUrl),
    images: fromImgs.images.filter((u) => u !== absolutizeUrl(hero, finalUrl)).slice(0, 10),
    internal_paths: extractInternalPaths(html, finalUrl),
    theme_color: theme && HEX_RE.test(theme) ? theme : null,
    word_count: text.split(/\s+/).filter(Boolean).length,
    has_booking_cta: BOOKING_RE.test(text),
    cms: detectCms(html, generator),
  }
}

export async function fetchProspectHtml(url: string): Promise<{ html: string; finalUrl: string; status: number }> {
  const normalized = normalizeProspectUrl(url)
  if (!normalized) throw new Error('Ungültige URL')
  const res = await fetch(normalized, {
    redirect: 'follow',
    signal: AbortSignal.timeout(12000),
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SimyWebsiteAudit/1.0; +https://www.simy.ch)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  const finalUrl = res.url || normalized
  const html = await res.text()
  return { html, finalUrl, status: res.status }
}

export function extractCityFromAddressLine(address?: string | null): { city: string | null; postal_code: string | null } {
  const addr = String(address || '')
  const m = addr.match(/\b(\d{4})\s+([A-Za-zÄÖÜäöüÉéÈè'’\-\s]+)\b/)
  if (!m) return { city: null, postal_code: null }
  return { postal_code: m[1], city: m[2].trim().split(',')[0].trim() }
}
