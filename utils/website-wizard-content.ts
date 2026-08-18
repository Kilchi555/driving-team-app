/**
 * Website wizard extras the tenant fills when Simy has no source row.
 * Shared by setup UI + wizard-save publish checks.
 */

export type WizardExtraService = {
  id: string
  name: string
  duration_minutes?: number | null
  price_chf?: number | null
  description?: string
  image_url?: string | null
}

export type WizardExtraProduct = {
  id: string
  name: string
  price_chf?: number | null
  description?: string
  image_url?: string | null
}

export type WizardTeamMember = {
  id: string
  source: 'staff' | 'custom'
  name: string
  role_label: string
  visible: boolean
  photo_url?: string | null
}

export type WizardMeetingPoint = {
  id: string
  source: 'location' | 'custom'
  name: string
  address?: string
  visible: boolean
}

export type WizardPublishInput = {
  name?: string | null
  bio?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  seo_title?: string | null
  seo_description?: string | null
  specializations?: string[]
  usps?: string[]
  dbServiceCount?: number
  extraServices?: WizardExtraService[]
  hasGoogleReviews?: boolean
  testimonials?: Array<{ text?: string; selected?: boolean }>
  teamMembers?: WizardTeamMember[]
}

export function newWizardId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function isInitialsOnlyStaffName(name: string) {
  const n = String(name || '').trim()
  if (!n) return true
  const parts = n.split(/\s+/).filter(Boolean)
  return parts.length >= 2 && parts.every((p) => p.length <= 1)
}

export function isSeedPlaceholderStaffName(name: string) {
  const lower = String(name || '').trim().toLowerCase()
  return /^(max|anna|test|demo)\s+muster/.test(lower) || /muster(mann|frau)$/.test(lower)
}

export function isWeakStaffName(name: string) {
  return isInitialsOnlyStaffName(name) || isSeedPlaceholderStaffName(name)
}

export function shouldHideStaffOnWebsite(
  name: string,
  tenant?: { name?: string | null; slug?: string | null },
) {
  if (isInitialsOnlyStaffName(name)) return true
  if (!isSeedPlaceholderStaffName(name)) return false
  const brand = `${tenant?.name || ''} ${tenant?.slug || ''}`
  return !/muster/i.test(brand)
}

export function isNonPhysicalLocationName(name: string) {
  return /^(telefon|phone|online|zoom|teams|call|videocall|skype)/i.test(String(name || '').trim())
}

export function normalizeExtraServices(raw: unknown): WizardExtraService[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => s && typeof s === 'object')
    .map((s: any) => ({
      id: String(s.id || newWizardId('extra')),
      name: String(s.name || '').trim(),
      duration_minutes:
        s.duration_minutes == null || s.duration_minutes === ''
          ? null
          : Number(s.duration_minutes) || null,
      price_chf:
        s.price_chf == null || s.price_chf === ''
          ? s.price != null && Number(s.price) > 20
            ? Math.round(Number(s.price) / 100)
            : null
          : Number(s.price_chf),
      description: String(s.description || '').trim(),
      image_url: String(s.image_url || '').trim() || null,
    }))
    .filter((s) => s.name)
    .slice(0, 12)
}

export function normalizeUsps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const v = String(item || '').trim()
    if (!v) continue
    const key = v.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v.slice(0, 80))
  }
  return out.slice(0, 8)
}

export function teamMemberNameKey(name: string) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function mergeTeamRoleLabels(...labels: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const parts: string[] = []
  for (const label of labels) {
    for (const part of String(label || '').split(/\s*[·,|/]\s*/)) {
      const trimmed = part.trim()
      if (!trimmed) continue
      const key = trimmed.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      parts.push(trimmed)
    }
  }
  return parts.join(' · ')
}

export function dedupeTeamMembersByName(members: WizardTeamMember[]): WizardTeamMember[] {
  const out: WizardTeamMember[] = []
  const indexByName = new Map<string, number>()
  for (const member of members) {
    const key = teamMemberNameKey(member.name)
    if (!key) {
      out.push({ ...member })
      continue
    }
    const existingAt = indexByName.get(key)
    if (existingAt == null) {
      indexByName.set(key, out.length)
      out.push({ ...member })
      continue
    }
    const current = out[existingAt]
    const preferIncomingStaff = member.source === 'staff' && current.source !== 'staff'
    const next = preferIncomingStaff ? { ...member } : current
    next.visible = current.visible || member.visible
    next.role_label = mergeTeamRoleLabels(current.role_label, member.role_label)
    next.photo_url = member.photo_url || current.photo_url || null
    if (preferIncomingStaff) {
      next.name = member.name || current.name
      out[existingAt] = next
    }
  }
  return out
}

export function normalizeTeamMembers(raw: unknown): WizardTeamMember[] {
  if (!Array.isArray(raw)) return []
  return dedupeTeamMembersByName(
    raw
      .filter((m) => m && typeof m === 'object')
      .map((m: any) => ({
        id: String(m.id || newWizardId('team')),
        source: m.source === 'custom' ? 'custom' : 'staff',
        name: String(m.name || '').trim(),
        role_label: String(m.role_label || '').trim() || 'Team',
        visible: m.visible !== false,
        photo_url: typeof m.photo_url === 'string' && m.photo_url.trim() ? m.photo_url.trim() : null,
      }))
      .filter((m) => m.name),
  ).slice(0, 12)
}

export function normalizeMeetingPoints(raw: unknown): WizardMeetingPoint[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((p) => p && typeof p === 'object')
    .map((p: any) => ({
      id: String(p.id || newWizardId('mp')),
      source: p.source === 'custom' ? 'custom' : 'location',
      name: String(p.name || '').trim(),
      address: String(p.address || '').trim(),
      visible: p.visible !== false,
    }))
    .filter((p) => p.name)
    .slice(0, 8)
}

export function extraServicesToLanding(extras: WizardExtraService[]) {
  return extras.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
    duration_minutes: s.duration_minutes,
    price_cents:
      s.price_chf != null && Number.isFinite(Number(s.price_chf))
        ? Math.round(Number(s.price_chf) * 100)
        : null,
    category: null as string | null,
    image_url: s.image_url || null,
  }))
}

export function normalizeExtraProducts(raw: unknown): WizardExtraProduct[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s) => s && typeof s === 'object')
    .map((s: any) => ({
      id: String(s.id || newWizardId('product')),
      name: String(s.name || '').trim(),
      price_chf:
        s.price_chf == null || s.price_chf === ''
          ? s.price != null && Number(s.price) > 20
            ? Math.round(Number(s.price) / 100)
            : null
          : Number(s.price_chf),
      description: String(s.description || '').trim(),
      image_url: typeof s.image_url === 'string' && s.image_url.trim() ? s.image_url.trim() : null,
    }))
    .filter((s) => s.name)
    .slice(0, 12)
}

export function extraProductsToLanding(extras: WizardExtraProduct[]) {
  return extras.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || '',
    price_cents:
      s.price_chf != null && Number.isFinite(Number(s.price_chf))
        ? Math.round(Number(s.price_chf) * 100)
        : null,
    category: null as string | null,
    source: 'custom' as const,
    image_url: s.image_url || null,
  }))
}

export function websitePublishContentMissing(input: WizardPublishInput): string[] {
  const missing: string[] = []
  if (!String(input.name || '').trim()) missing.push('Firmenname fehlt.')
  if (String(input.bio || '').trim().length < 40) {
    missing.push('Bio fehlt oder ist zu kurz (mind. 2 Sätze).')
  }
  if (!String(input.address || '').trim()) missing.push('Adresse fehlt.')
  if (!String(input.phone || '').trim() && !String(input.email || '').trim()) {
    missing.push('Telefon oder E-Mail fehlt.')
  }
  if (!String(input.seo_title || '').trim()) missing.push('SEO-Titel fehlt.')
  if (!String(input.seo_description || '').trim()) missing.push('SEO-Beschreibung fehlt.')

  const extras = (input.extraServices || []).filter((s) => s.name && s.price_chf != null && Number(s.price_chf) > 0)
  const serviceCount = Number(input.dbServiceCount || 0) + extras.length
  if (serviceCount < 1) missing.push('Mindestens ein Angebot mit Preis fehlt.')

  const hasSpec =
    (input.specializations || []).some((s) => String(s || '').trim()) ||
    (input.usps || []).some((s) => String(s || '').trim())
  if (!hasSpec) missing.push('Mindestens eine Spezialisierung oder ein Vorteil fehlt.')

  const hasSocial =
    !!input.hasGoogleReviews ||
    (input.testimonials || []).some((t) => String(t.text || '').trim().length >= 20 && t.selected !== false)
  if (!hasSocial) {
    missing.push('Google-Standort oder mindestens eine echte Kundenstimme fehlt.')
  }

  const visibleTeam = (input.teamMembers || []).filter((m) => m.visible && String(m.name || '').trim())
  if (visibleTeam.length < 1) missing.push('Mindestens eine Person im Team muss auf der Website stehen.')

  return missing
}
