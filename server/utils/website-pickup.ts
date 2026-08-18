/**
 * Website copy for tenants that allow a customer-chosen meeting point
 * within a travel-time radius. Never publish private pickup addresses.
 */
export const WEBSITE_PICKUP_POINT = {
  id: 'pickup',
  name: 'Eigener Treffpunkt',
  address: 'Im Radius — Adresse bei der Buchung angeben',
} as const

export type WebsitePickupOffer = {
  enabled: boolean
  radiusMinutes: number | null
  originPlz: string[]
}

export function swissPlzFromValue(value?: string | null): string | null {
  const direct = String(value || '').trim()
  if (/^\d{4}$/.test(direct)) return direct
  const match = String(value || '').match(/\b([1-9]\d{3})\b/)
  return match?.[1] || null
}

export async function loadWebsitePickupOffer(
  supabase: { from: (table: string) => any },
  tenantId: string,
): Promise<WebsitePickupOffer> {
  const { data: setting } = await supabase
    .from('tenant_settings')
    .select('setting_key, setting_value')
    .eq('tenant_id', tenantId)
    .in('setting_key', ['allow_pickup_mode', 'default_pickup_radius_minutes'])

  const map = new Map(
    (setting || []).map((row: any) => [String(row.setting_key), row.setting_value]),
  )
  const allowed = String(map.get('allow_pickup_mode') || '').toLowerCase() === 'true'
  if (!allowed) return { enabled: false, radiusMinutes: null, originPlz: [] }

  const { data: locs } = await supabase
    .from('locations')
    .select(
      'id, pickup_enabled, pickup_radius_minutes, category_pickup_settings, postal_code, address, location_type',
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)

  const active = (locs || []).filter((loc: any) => {
    const type = String(loc.location_type || 'standard').toLowerCase()
    if (type === 'pickup' || type === 'home' || type === 'customer') return false
    if (loc.pickup_enabled) return true
    const cats = loc.category_pickup_settings || {}
    return Object.values(cats).some((c: any) => c?.enabled === true)
  })
  if (!active.length) return { enabled: false, radiusMinutes: null, originPlz: [] }

  const radii = active
    .map((loc: any) => Number(loc.pickup_radius_minutes))
    .filter((n: number) => Number.isFinite(n) && n > 0)
  const fallback = Number(map.get('default_pickup_radius_minutes'))
  const radiusMinutes =
    radii.length
      ? Math.max(...radii)
      : Number.isFinite(fallback) && fallback > 0
        ? fallback
        : null

  const originPlz = [
    ...new Set(
      active
        .map((loc: any) => swissPlzFromValue(loc.postal_code) || swissPlzFromValue(loc.address))
        .filter(Boolean) as string[],
    ),
  ]

  return { enabled: true, radiusMinutes, originPlz }
}

export function isPickupFaq(item: { q?: string; a?: string } | null | undefined) {
  return /eigener treffpunkt|wunschort|wunschadresse|im radius|pickup|abhol/i.test(
    `${item?.q || ''} ${item?.a || ''}`,
  )
}

export function buildPickupFaq(
  formal: 'sie' | 'du',
  radiusMinutes?: number | null,
) {
  const du = formal === 'du'
  const radius =
    radiusMinutes && radiusMinutes > 0
      ? du
        ? ` im Umkreis von ca. ${radiusMinutes} Minuten Fahrtzeit`
        : ` im Umkreis von ca. ${radiusMinutes} Minuten Fahrtzeit`
      : du
        ? ' im hinterlegten Umkreis'
        : ' im hinterlegten Umkreis'
  return {
    q: du ? 'Kann ich einen eigenen Treffpunkt angeben?' : 'Kann ich einen eigenen Treffpunkt angeben?',
    a: du
      ? `Ja. Bei der Buchung kannst du einen Wunschort${radius} eintragen. Liegt die Adresse ausserhalb, wählst du einen der festen Treffpunkte.`
      : `Ja. Bei der Buchung können Sie einen Wunschort${radius} eintragen. Liegt die Adresse ausserhalb, wählen Sie einen der festen Treffpunkte.`,
  }
}

export function withPickupMeetingPoint(
  points: Array<{ id?: string; name?: string; address?: string | null }>,
  pickup: boolean,
) {
  const list = (points || [])
    .filter((p) => p?.name && String(p.id || '') !== WEBSITE_PICKUP_POINT.id)
    .map((p, i) => ({
      id: String(p.id || `mp-${i}`),
      name: String(p.name).trim(),
      address: String(p.address || '').trim() || null,
    }))
  if (!pickup) return list.slice(0, 8)
  if (list.some((p) => /eigener treffpunkt|wunschort|pickup|abhol/i.test(p.name))) {
    return list.slice(0, 8)
  }
  return [{ ...WEBSITE_PICKUP_POINT }, ...list].slice(0, 8)
}

export function withPickupProcessText(text: string, pickup: boolean, formal: 'sie' | 'du') {
  if (!pickup) return text
  if (/wunschort|eigenen treffpunkt|radius/i.test(text)) return text
  const extra =
    formal === 'du'
      ? ' Optional: eigener Treffpunkt im Radius.'
      : ' Optional: eigener Treffpunkt im Radius.'
  return `${String(text || '').replace(/\s+$/, '')}${extra}`
}
