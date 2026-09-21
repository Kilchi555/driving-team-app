import { findBlock, isLandingPayload, type LandingPagePayload } from '~/utils/website-slot-schema'

function homepageHasContent(blocks: unknown): boolean {
  if (!blocks || typeof blocks !== 'object') return false
  const landing = blocks as { blocks?: unknown[] }
  if (Array.isArray(landing.blocks) && landing.blocks.length > 0) return true
  return Object.keys(blocks as object).length > 0
}

export type WebsiteQualitySeverity = 'BLOCKING' | 'WARNING' | 'INFO'
export type WebsiteQualityCategory =
  | 'structural'
  | 'content'
  | 'legal'
  | 'seo'
  | 'conversion'
  | 'accessibility'
  | 'performance'
  | 'ai_content'

export type WebsiteQualityCheck = {
  check_id: string
  category: WebsiteQualityCategory
  severity: WebsiteQualitySeverity
  passed: boolean
  message: string
  metadata?: Record<string, unknown>
}

export type WebsiteQualityInput = {
  homepageBlocks: unknown
  pages?: Array<{ slug?: string | null; is_home?: boolean | null; title?: string | null }>
  businessType?: string | null
  bookingUrl?: string | null
}

export type WebsiteQualityResult = {
  passed: boolean
  blockingIssues: WebsiteQualityCheck[]
  warnings: WebsiteQualityCheck[]
  checks: WebsiteQualityCheck[]
}

const TITLE_WARN_LEN = 70
const DESC_WARN_LEN = 180

function check(
  check_id: string,
  category: WebsiteQualityCategory,
  severity: WebsiteQualitySeverity,
  passed: boolean,
  message: string,
  metadata?: Record<string, unknown>,
): WebsiteQualityCheck {
  return { check_id, category, severity, passed, message, ...(metadata ? { metadata } : {}) }
}

function text(value: unknown): string {
  return String(value || '').trim()
}

function landingFrom(blocks: unknown): LandingPagePayload | null {
  return isLandingPayload(blocks) ? blocks : null
}

function collectH1s(landing: LandingPagePayload): string[] {
  const hero = findBlock(landing, 'hero')
  const headline = text(hero?.content?.headline)
  return headline ? [headline] : []
}

function hasMeaningfulLabel(value: unknown): boolean {
  const label = text(value)
  if (!label) return false
  return !/^(click here|here|mehr|link|www\.|https?:)/i.test(label)
}

function walkImagesMissingAlt(landing: LandingPagePayload): number {
  let missing = 0
  const hero = text(landing.brand?.hero_image_url)
  if (hero && !text((landing.brand as { hero_image_alt?: unknown } | undefined)?.hero_image_alt)) {
    missing += 1
  }
  for (const block of landing.blocks) {
    const content = block.content || {}
    const images = [
      content.image_url,
      content.photo_url,
      ...(Array.isArray(content.images) ? content.images : []),
      ...(Array.isArray(content.items) ? content.items.map((item: { image_url?: unknown }) => item?.image_url) : []),
    ]
    for (const image of images) {
      if (typeof image === 'string' && image.trim()) missing += 1
      else if (image && typeof image === 'object') {
        const rec = image as { url?: unknown; src?: unknown; alt?: unknown }
        if (text(rec.url || rec.src) && !text(rec.alt)) missing += 1
      }
    }
  }
  return missing
}

function invalidInternalUrls(landing: LandingPagePayload): string[] {
  const bad: string[] = []
  const urls = [landing.bookingUrl, landing.siteUrl, findBlock(landing, 'cta')?.content?.cta_url]
  for (const raw of urls) {
    const value = text(raw)
    if (!value) continue
    if (value.startsWith('/') || value.startsWith('#')) continue
    if (!/^https?:\/\//i.test(value) && !value.startsWith('mailto:') && !value.startsWith('tel:')) {
      bad.push(value)
    }
  }
  return bad
}

/**
 * Deterministic website quality gate. No numeric vanity scores.
 * BLOCKING is reserved for a broken publish artifact.
 * SEO / conversion / a11y / legal are WARNING so #251 payment/QA rules stay the only hard business gates.
 */
export function runWebsiteQualityChecks(input: WebsiteQualityInput): WebsiteQualityResult {
  const checks: WebsiteQualityCheck[] = []
  const landing = landingFrom(input.homepageBlocks)
  const pages = input.pages || []

  const hasHome = input.homepageBlocks != null
  checks.push(check(
    'STRUCT_HOMEPAGE_MISSING',
    'structural',
    'BLOCKING',
    hasHome,
    hasHome ? 'Homepage-Datensatz vorhanden.' : 'Homepage fehlt.',
  ))

  const hasContent = homepageHasContent(input.homepageBlocks)
  checks.push(check(
    'STRUCT_HOMEPAGE_EMPTY',
    'structural',
    'BLOCKING',
    hasContent,
    hasContent ? 'Homepage enthält Inhalt.' : 'Homepage hat keinen veröffentlichbaren Inhalt.',
  ))

  const validPayload = !!landing
  checks.push(check(
    'STRUCT_INVALID_PAYLOAD',
    'structural',
    'WARNING',
    validPayload,
    validPayload ? 'Landing-Payload ist gültig.' : 'Landing-Payload ist kein gültiges Slot-Schema.',
  ))

  if (landing) {
    const badUrls = invalidInternalUrls(landing)
    checks.push(check(
      'STRUCT_INVALID_URL',
      'structural',
      'WARNING',
      badUrls.length === 0,
      badUrls.length === 0 ? 'Geprüfte URLs sind gültig.' : 'Mindestens eine URL ist ungültig.',
      badUrls.length ? { urls: badUrls } : undefined,
    ))

    const h1s = collectH1s(landing)
    checks.push(check(
      'CONTENT_H1_MISSING',
      'content',
      'WARNING',
      h1s.length > 0,
      h1s.length > 0 ? 'H1 (Hero-Überschrift) vorhanden.' : 'H1 (Hero-Überschrift) fehlt.',
    ))
    checks.push(check(
      'SEO_H1_UNIQUE',
      'seo',
      'WARNING',
      h1s.length <= 1,
      h1s.length <= 1 ? 'H1 ist eindeutig.' : 'Mehrere H1-Texte gefunden.',
      { count: h1s.length },
    ))

    const brand = text(landing.brand?.name)
    checks.push(check(
      'CONTENT_BRAND_MISSING',
      'content',
      'WARNING',
      !!brand,
      brand ? 'Business-Name vorhanden.' : 'Business-Name fehlt.',
    ))

    const services = findBlock(landing, 'services')
    const serviceItems = Array.isArray(services?.content?.items) ? services!.content.items : []
    const hasServices = serviceItems.some((item: { name?: unknown; title?: unknown }) =>
      text(item?.name || item?.title),
    )
    checks.push(check(
      'CONTENT_SERVICES_MISSING',
      'content',
      'WARNING',
      hasServices,
      hasServices ? 'Angebote vorhanden.' : 'Keine Angebote hinterlegt.',
    ))

    const cta = findBlock(landing, 'cta')
    const hasCta = !!(text(cta?.content?.cta_text) || text(cta?.content?.headline) || text(landing.bookingUrl))
    checks.push(check(
      'CONTENT_CTA_MISSING',
      'content',
      'WARNING',
      hasCta,
      hasCta ? 'Primärer CTA vorhanden.' : 'Primärer CTA fehlt.',
    ))

    const contact = findBlock(landing, 'contact')
    const phone = text(contact?.content?.phone)
    const email = text(contact?.content?.email)
    checks.push(check(
      'CONTENT_CONTACT_MISSING',
      'content',
      'WARNING',
      !!(phone || email),
      phone || email ? 'Kontaktmöglichkeit vorhanden.' : 'Telefon und E-Mail fehlen.',
    ))
    checks.push(check(
      'CONV_PHONE_EMAIL_MISSING',
      'conversion',
      'WARNING',
      !!(phone || email),
      phone || email ? 'Kontaktpfad vorhanden.' : 'Kein Telefon/E-Mail für Conversion.',
    ))

    const city = text(contact?.content?.city || contact?.content?.address)
    checks.push(check(
      'CONV_LOCATION_MISSING',
      'conversion',
      'WARNING',
      !!city,
      city ? 'Standortinformation vorhanden.' : 'Standortinformation fehlt.',
    ))

    const booking = text(landing.bookingUrl) || !!findBlock(landing, 'slots') || !!findBlock(landing, 'courses')
    checks.push(check(
      'CONV_BOOKING_PATH_MISSING',
      'conversion',
      'WARNING',
      !!booking,
      booking ? 'Buchungspfad vorhanden.' : 'Kein Buchungs- oder Kurs-Pfad gefunden.',
      { bookingUrl: text(input.bookingUrl || landing.bookingUrl) || null },
    ))

    const title = text(landing.seo?.title)
    checks.push(check(
      'SEO_TITLE_MISSING',
      'seo',
      'WARNING',
      !!title,
      title ? 'SEO-Titel vorhanden.' : 'SEO-Titel fehlt.',
    ))
    checks.push(check(
      'SEO_TITLE_TOO_LONG',
      'seo',
      'WARNING',
      !title || title.length <= TITLE_WARN_LEN,
      !title || title.length <= TITLE_WARN_LEN
        ? 'SEO-Titel-Länge ist akzeptabel.'
        : `SEO-Titel ist sehr lang (${title.length} Zeichen).`,
      { length: title.length, limit: TITLE_WARN_LEN },
    ))

    const description = text(landing.seo?.description)
    checks.push(check(
      'SEO_DESCRIPTION_MISSING',
      'seo',
      'WARNING',
      !!description,
      description ? 'Meta-Description vorhanden.' : 'Meta-Description fehlt.',
    ))
    checks.push(check(
      'SEO_DESCRIPTION_TOO_LONG',
      'seo',
      'WARNING',
      !description || description.length <= DESC_WARN_LEN,
      !description || description.length <= DESC_WARN_LEN
        ? 'Meta-Description-Länge ist akzeptabel.'
        : `Meta-Description ist sehr lang (${description.length} Zeichen).`,
      { length: description.length, limit: DESC_WARN_LEN },
    ))

    const og = text(landing.brand?.hero_image_url)
    checks.push(check(
      'SEO_OG_IMAGE_MISSING',
      'seo',
      'WARNING',
      !!og,
      og ? 'OG-/Hero-Bild vorhanden.' : 'OG-/Hero-Bild fehlt.',
    ))

    const schema = landing.schema && typeof landing.schema === 'object' && Object.keys(landing.schema).length > 0
    checks.push(check(
      'SEO_SCHEMA_MISSING',
      'seo',
      'WARNING',
      !!schema,
      schema ? 'Structured Data vorhanden.' : 'Structured Data fehlt.',
    ))

    const missingAlt = walkImagesMissingAlt(landing)
    checks.push(check(
      'A11Y_IMAGE_ALT_MISSING',
      'accessibility',
      'WARNING',
      missingAlt === 0,
      missingAlt === 0 ? 'Geprüfte Bilder haben Alt-Text oder sind nicht gesetzt.' : `${missingAlt} Bild(er) ohne Alt-Text.`,
      { missing: missingAlt },
    ))

    const ctaLabel = text(cta?.content?.cta_text)
    checks.push(check(
      'A11Y_LINK_LABEL_MISSING',
      'accessibility',
      'WARNING',
      !ctaLabel || hasMeaningfulLabel(ctaLabel),
      !ctaLabel || hasMeaningfulLabel(ctaLabel)
        ? 'CTA-Label ist aussagekräftig oder fehlt (separater Content-Check).'
        : 'CTA-Label ist nicht aussagekräftig.',
      { label: ctaLabel || null },
    ))

    checks.push(check(
      'PERF_HERO_IMAGE_PRESENT',
      'performance',
      'INFO',
      !!og,
      og
        ? 'Hero-Bild gesetzt. Dimensions-/Lighthouse-Checks folgen später im Browser.'
        : 'Kein Hero-Bild — späterer Lighthouse-Lauf nicht blockierend.',
    ))
  }

  const slugs = pages.map((page) => text(page.slug).toLowerCase())
  const hasImpressum = slugs.includes('impressum')
  const hasPrivacy = slugs.includes('datenschutz')
  checks.push(check(
    'LEGAL_IMPRESSUM_MISSING',
    'legal',
    'WARNING',
    hasImpressum,
    hasImpressum ? 'Impressum-Seite vorhanden.' : 'Impressum-Seite fehlt (strukturell, keine Rechtsprüfung).',
  ))
  checks.push(check(
    'LEGAL_PRIVACY_MISSING',
    'legal',
    'WARNING',
    hasPrivacy,
    hasPrivacy ? 'Datenschutz-Seite vorhanden.' : 'Datenschutz-Seite fehlt (strukturell, keine Rechtsprüfung).',
  ))

  const drivingSchool = /driving|fahrschul/i.test(text(input.businessType))
  if (drivingSchool && landing) {
    const hasCourses = !!findBlock(landing, 'courses')
    const hasSlots = !!findBlock(landing, 'slots')
    checks.push(check(
      'CONV_DRIVING_SCHOOL_OFFER',
      'conversion',
      'WARNING',
      hasCourses || hasSlots || !!findBlock(landing, 'services'),
      hasCourses || hasSlots || !!findBlock(landing, 'services')
        ? 'Fahrschul-Angebot/Buchung strukturell vorhanden.'
        : 'Fahrschul-typische Kurse/Slots fehlen.',
    ))
  }

  const blockingIssues = checks.filter((item) => !item.passed && item.severity === 'BLOCKING')
  const warnings = checks.filter((item) => !item.passed && item.severity === 'WARNING')
  return {
    passed: blockingIssues.length === 0,
    blockingIssues,
    warnings,
    checks,
  }
}
