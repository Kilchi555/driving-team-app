/**
 * Tenant fields that are safe and useful to publish on the public website.
 * Never include IBAN, payment IDs, ads accounts, or private pickup/home addresses.
 */
import { isNonPhysicalLocationName } from '~/utils/website-wizard-content'
import { withPickupMeetingPoint } from '~/server/utils/website-pickup'

export type WebsitePublicLocation = {
  id: string
  name: string
  address: string | null
  city?: string | null
}

export type WebsiteSocialLink = {
  key: string
  label: string
  href: string
}

const HIDDEN_LOCATION_TYPES = new Set(['pickup', 'home', 'customer'])

function normalizePlace(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function formatWebsiteLocationAddress(loc: {
  formatted_address?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
}) {
  const formatted = String(loc.formatted_address || '').trim()
  if (formatted && !/^remote\b/i.test(formatted)) return formatted
  const street = String(loc.address || '').trim()
  if (street && /^remote\b/i.test(street)) return ''
  const cityLine = [loc.postal_code, loc.city].filter(Boolean).join(' ').trim()
  return [street, cityLine].filter(Boolean).join(', ')
}

/**
 * Booking locations that are physically public (not pickup/home).
 * Used in the website editor/init data — not listed on the public contact block.
 */
export function isPublicWebsiteLocation(loc: {
  name?: string | null
  address?: string | null
  formatted_address?: string | null
  city?: string | null
  location_type?: string | null
  is_active?: boolean | null
  public_bookable?: boolean | null
}) {
  if (loc.is_active === false) return false
  if (loc.public_bookable === false) return false
  const type = String(loc.location_type || 'standard').toLowerCase()
  if (HIDDEN_LOCATION_TYPES.has(type)) return false
  if (type !== 'standard') return false
  const name = String(loc.name || '').trim()
  if (!name || isNonPhysicalLocationName(name)) return false
  const address = formatWebsiteLocationAddress(loc)
  if (!address && !String(loc.city || '').trim()) return false
  return true
}

export async function loadWebsitePublicLocations(
  supabase: { from: (table: string) => any },
  tenantId: string,
): Promise<WebsitePublicLocation[]> {
  const { data } = await supabase
    .from('locations')
    .select(
      'id, name, address, formatted_address, city, postal_code, location_type, is_active, public_bookable',
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(30)

  return (data || [])
    .filter((loc: any) => isPublicWebsiteLocation(loc))
    .map((loc: any) => ({
      id: String(loc.id),
      name: String(loc.name).trim(),
      address: formatWebsiteLocationAddress(loc) || null,
      city: loc.city ? String(loc.city).trim() : null,
    }))
}

export function mergeWebsiteMeetingPoints(
  existing: Array<{ id?: string; name?: string; address?: string | null }>,
  fromDb: WebsitePublicLocation[],
  pickup: boolean,
) {
  const out: Array<{ id: string; name: string; address: string | null }> = []
  const seen = new Set<string>()

  const push = (point: { id?: string; name?: string; address?: string | null }) => {
    const name = String(point?.name || '').trim()
    if (!name) return
    const address = String(point.address || '').trim() || null
    const keys = [normalizePlace(name), normalizePlace(address || '')].filter(Boolean)
    if (keys.some((k) => seen.has(k))) return
    for (const k of keys) seen.add(k)
    out.push({
      id: String(point.id || `mp-${out.length}`),
      name,
      address,
    })
  }

  for (const loc of fromDb) push(loc)
  for (const point of existing || []) push(point)
  return withPickupMeetingPoint(out, pickup)
}

const SOCIAL_FIELDS: Array<{ key: string; label: string; match: RegExp }> = [
  { key: 'instagram', label: 'Instagram', match: /instagram\.com/i },
  { key: 'facebook', label: 'Facebook', match: /facebook\.com|fb\.com/i },
  { key: 'linkedin', label: 'LinkedIn', match: /linkedin\.com/i },
  { key: 'tiktok', label: 'TikTok', match: /tiktok\.com/i },
  { key: 'youtube', label: 'YouTube', match: /youtube\.com|youtu\.be/i },
  { key: 'x', label: 'X', match: /(?:twitter|x)\.com/i },
]

function normalizeSocialUrl(raw: unknown): string | null {
  const value = String(raw || '').trim()
  if (!value) return null
  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

export function tenantPublicSocialLinks(tenant: Record<string, any> | null | undefined): WebsiteSocialLink[] {
  const candidates = [
    tenant?.instagram_url,
    tenant?.facebook_url,
    tenant?.tiktok_url,
    tenant?.youtube_url,
    tenant?.social_instagram,
    tenant?.social_facebook,
    tenant?.social_linkedin,
    tenant?.social_twitter,
    tenant?.website_instagram,
    tenant?.website_facebook,
  ]
  const out: WebsiteSocialLink[] = []
  const seen = new Set<string>()
  for (const raw of candidates) {
    const href = normalizeSocialUrl(raw)
    if (!href) continue
    const hostPath = href.replace(/\/+$/, '').toLowerCase()
    if (seen.has(hostPath)) continue
    seen.add(hostPath)
    const known = SOCIAL_FIELDS.find((s) => s.match.test(href))
    out.push({
      key: known?.key || `web-${out.length}`,
      label: known?.label || 'Web',
      href,
    })
  }
  return out.slice(0, 6)
}

export function tenantHqCoveredByMeetingPoints(
  hq: { address?: string | null; postal_code?: string | null; city?: string | null },
  points: Array<{ id?: string; name?: string; address?: string | null }>,
) {
  const physical = (points || []).filter(
    (p) => String(p.id || '') !== 'pickup' && !/eigener treffpunkt|wunschort/i.test(String(p.name || '')),
  )
  if (!physical.length) return false
  const street = normalizePlace(String(hq.address || ''))
  const hqLine = normalizePlace([hq.address, hq.postal_code, hq.city].filter(Boolean).join(' '))
  if (!street && !hqLine) return false
  return physical.some((p) => {
    const pa = normalizePlace(String(p.address || ''))
    if (!pa) return false
    return (
      (street && (pa.includes(street) || street.includes(pa))) ||
      (hqLine && (pa.includes(hqLine) || hqLine.includes(pa)))
    )
  })
}
