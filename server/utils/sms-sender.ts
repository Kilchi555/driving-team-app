/**
 * Twilio alphanumeric sender IDs: max 11 chars, ≥1 letter, letters/digits/spaces only.
 *
 * Naive substring(0, 11) turns "Fahrschule Driving Team" into "Fahrschule".
 * Always prefer the configured SMS sender, then a brand-like slice of the tenant name.
 */

const GENERIC_WORDS = new Set([
  'fahrschule',
  'fahrlehrerschule',
  'unternehmen',
  'gmbh',
  'ag',
  'llc',
  'inc',
  'ltd',
  'sarl',
  'sagl',
  'die',
  'der',
  'das',
  'the',
])

/** Industry nouns that must never be the SMS sender when a real tenant name exists. */
const GENERIC_SENDERS = new Set([
  'fahrschule',
  'unternehmen',
  'praxis',
  'studio',
  'schule',
])

export function toAlphanumericSenderId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const clean = String(raw)
    .replace(/ä/gi, 'a')
    .replace(/ö/gi, 'o')
    .replace(/ü/gi, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 11)
    .trim()
  return clean && /[a-zA-Z]/.test(clean) ? clean : null
}

function stripGenericWords(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const kept = words.filter((w) => !GENERIC_WORDS.has(w.toLowerCase()))
  return kept.length ? kept.join(' ') : name
}

/** Compact brand ("Driving Team" → "DrivingTeam") if it still fits in 11 chars. */
function preferCompactBrand(name: string): string {
  const compact = name.replace(/\s+/g, '')
  return compact.length > 0 && compact.length <= 11 ? compact : name
}

export function deriveSmsSenderFromTenantName(tenantName: string | null | undefined): string | null {
  const raw = (tenantName || '').trim()
  if (!raw) return null

  const brand = preferCompactBrand(stripGenericWords(raw))
  const fromBrand = toAlphanumericSenderId(brand)
  if (fromBrand && !GENERIC_SENDERS.has(fromBrand.toLowerCase())) return fromBrand

  const fromRaw = toAlphanumericSenderId(preferCompactBrand(raw))
  if (fromRaw && !GENERIC_SENDERS.has(fromRaw.toLowerCase())) return fromRaw

  return fromBrand || fromRaw
}

export function resolveSmsSenderName(opts: {
  twilioFromSender?: string | null
  tenantName?: string | null
  fallback?: string | null
}): string | undefined {
  const configured = toAlphanumericSenderId(opts.twilioFromSender)
  if (configured) return configured

  const fromName = deriveSmsSenderFromTenantName(opts.tenantName)
  if (fromName) return fromName

  const fallback = toAlphanumericSenderId(opts.fallback)
  if (fallback && !GENERIC_SENDERS.has(fallback.toLowerCase())) return fallback

  return fromName || fallback || undefined
}
