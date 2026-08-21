/**
 * Premium website helpers (CHF 490 SKU): hours, WhatsApp, legal, team, schema extras.
 */
import type { WorkingDaysTemplate } from '~/utils/workingDaysTemplate'
import { getWorkingDaysTemplateDefaults } from '~/utils/workingDaysTemplate'
import { getTerminologyDefaults } from '~/composables/useTerminology'

const DAY_LABELS_DE: Record<number, string> = {
  1: 'Montag',
  2: 'Dienstag',
  3: 'Mittwoch',
  4: 'Donnerstag',
  5: 'Freitag',
  6: 'Samstag',
  7: 'Sonntag',
}

const DAY_SCHEMA: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export type OpeningHoursRow = {
  day: number
  label: string
  open: boolean
  start: string | null
  end: string | null
  display: string
}

export function resolveWorkingTemplate(
  tenant: { business_type?: string | null; working_days_template?: unknown } | null | undefined,
): WorkingDaysTemplate {
  return getWorkingDaysTemplateDefaults(tenant?.business_type, tenant?.working_days_template)
}

export function formatOpeningHours(tpl: WorkingDaysTemplate): OpeningHoursRow[] {
  const rows: OpeningHoursRow[] = []
  for (let d = 1; d <= 7; d++) {
    const open = tpl.days.includes(d)
    const slot = tpl.schedule?.[d]
    const start = open ? slot?.start || tpl.start_time || null : null
    const end = open ? slot?.end || tpl.end_time || null : null
    rows.push({
      day: d,
      label: DAY_LABELS_DE[d],
      open,
      start,
      end,
      display: open && start && end ? `${start}–${end}` : 'Geschlossen',
    })
  }
  return rows
}

export function openingHoursToSchema(tpl: WorkingDaysTemplate) {
  return tpl.days
    .filter((d) => d >= 1 && d <= 7)
    .map((d) => {
      const slot = tpl.schedule?.[d]
      const start = slot?.start || tpl.start_time
      const end = slot?.end || tpl.end_time
      if (!start || !end) return null
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAY_SCHEMA[d],
        opens: start,
        closes: end,
      }
    })
    .filter(Boolean)
}

/** Normalize to digits with CH country code when possible. */
export function phoneDigitsForWhatsApp(phone?: string | null): string | null {
  if (!phone) return null
  let digits = String(phone).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `41${digits.slice(1)}`
  if (!digits.startsWith('41') && digits.length <= 10) digits = `41${digits}`
  return digits
}

/** Swiss mobiles are 07x → 417… Landlines (044, 043, …) cannot open WhatsApp. */
export function isWhatsAppCapablePhone(phone?: string | null): boolean {
  const digits = phoneDigitsForWhatsApp(phone)
  return !!digits && digits.startsWith('417') && digits.length >= 11 && digits.length <= 13
}

/**
 * Dedicated WhatsApp number wins. Otherwise only a mobile contact phone —
 * never a landline.
 */
export function resolveWhatsAppPhone(
  whatsappPhone?: string | null,
  fallbackPhone?: string | null,
): string | null {
  const dedicated = String(whatsappPhone || '').trim()
  if (dedicated) return dedicated
  const fallback = String(fallbackPhone || '').trim()
  if (fallback && isWhatsAppCapablePhone(fallback)) return fallback
  return null
}

/** CH phone → wa.me link */
export function whatsappUrlFromPhone(phone?: string | null): string | null {
  const digits = phoneDigitsForWhatsApp(phone)
  if (!digits) return null
  return `https://wa.me/${digits}`
}

export function whatsappUrlForTenant(tenant: {
  whatsapp_phone?: string | null
  contact_phone?: string | null
  phone?: string | null
}): string | null {
  return whatsappUrlFromPhone(resolveWhatsAppPhone(tenant.whatsapp_phone, tenant.contact_phone || tenant.phone))
}

export function mapsEmbedUrl(addressParts: Array<string | null | undefined>): string | null {
  const q = addressParts.map((p) => String(p || '').trim()).filter(Boolean).join(', ')
  if (!q) return null
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&hl=de&z=15&output=embed`
}

export function mapsExternalUrl(addressParts: Array<string | null | undefined>): string | null {
  const q = addressParts.map((p) => String(p || '').trim()).filter(Boolean).join(', ')
  if (!q) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export type LandingTeamMember = {
  id: string
  name: string
  role_label: string
  languages: string[]
  categories: string[]
  photo_url: string | null
}

const LANG_LABELS: Record<string, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  fr: 'Französisch',
  it: 'Italienisch',
  sq: 'Albanisch',
  pt: 'Portugiesisch',
  es: 'Spanisch',
  tr: 'Türkisch',
  hr: 'Kroatisch',
  sr: 'Serbisch',
  bs: 'Bosnisch',
  ar: 'Arabisch',
}

function languageLabel(code: string) {
  const key = String(code || '').trim()
  if (!key) return ''
  return LANG_LABELS[key.toLowerCase()] || key
}

export function mapStaffToTeam(
  rows: Array<{
    id: string
    first_name?: string | null
    last_name?: string | null
    role?: string | null
    language?: string | null
    category?: string[] | null
    profession?: string | null
    metadata?: any
  }>,
  businessType?: string | null,
): LandingTeamMember[] {
  const staffLabel = getTerminologyDefaults(businessType).staff
  return rows
    .map((u) => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
      if (!name) return null
      const meta = u.metadata && typeof u.metadata === 'object' ? u.metadata : {}
      const spoken = Array.isArray(meta.languages)
        ? meta.languages.map((x: any) => languageLabel(String(x)))
        : u.language
          ? [languageLabel(u.language)]
          : []
      const photo =
        (typeof meta.photo_url === 'string' && meta.photo_url) ||
        (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
        null
      const profession = String(u.profession || meta.role_label || '').trim()
      return {
        id: u.id,
        name,
        role_label: profession || (u.role === 'admin' ? 'Inhaber/in' : staffLabel),
        languages: [...new Set(spoken.filter(Boolean))],
        categories: Array.isArray(u.category)
          ? [...new Set(u.category.map((c) => String(c).trim()).filter(Boolean))]
          : [],
        photo_url: photo,
      } as LandingTeamMember
    })
    .filter(Boolean) as LandingTeamMember[]
}

function teamMemberScore(m: LandingTeamMember) {
  return (m.photo_url ? 2 : 0) + (m.categories?.length || 0) + (m.languages?.length || 0)
}

export function dedupeWebsiteTeam(members: LandingTeamMember[]): LandingTeamMember[] {
  const byName = new Map<string, LandingTeamMember>()
  for (const member of members) {
    const key = String(member.name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
    if (!key) continue
    const prev = byName.get(key)
    if (!prev) {
      byName.set(key, member)
      continue
    }
    const keep =
      teamMemberScore(member) > teamMemberScore(prev)
        ? { ...prev, ...member }
        : { ...member, ...prev }
    if (prev.role_label === 'Inhaber/in' || member.role_label === 'Inhaber/in') {
      keep.role_label = 'Inhaber/in'
    }
    keep.languages = [...new Set([...(prev.languages || []), ...(member.languages || [])])]
    keep.categories = [...new Set([...(prev.categories || []), ...(member.categories || [])])]
    keep.photo_url = keep.photo_url || prev.photo_url || member.photo_url
    byName.set(key, keep)
  }
  return [...byName.values()]
}

export type UpcomingCourseCard = {
  id: string
  title: string
  category: string | null
  starts_at: string | null
  ends_at?: string | null
  location: string | null
  spots_left: number | null
  price_chf: number | null
  href: string | null
}

export type WebsiteTeaserSlotCard = {
  id: string
  start_time: string
  end_time: string
  duration_minutes: number | null
  category_code: string | null
  label: string
  day_label: string
  time_label: string
  book_url: string
}

export function pickTemplateVariant(seed: string): 'classic' | 'bold' | 'editorial' {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const variants = ['classic', 'bold', 'editorial'] as const
  return variants[h % variants.length]
}

export function buildImpressumHtml(tenant: {
  name?: string | null
  legal_company_name?: string | null
  address?: string | null
  city?: string | null
  invoice_city?: string | null
  postal_code?: string | null
  invoice_zip?: string | null
  contact_email?: string | null
  email?: string | null
  contact_phone?: string | null
  phone?: string | null
  company_type?: string | null
  legal_form?: string | null
  uid_number?: string | null
  mwst_obligated?: boolean | null
  handelsregister_nr?: string | null
  first_name?: string | null
  last_name?: string | null
  contact_person_first_name?: string | null
  contact_person_last_name?: string | null
}): string {
  const name = tenant.legal_company_name || tenant.name || 'Unternehmen'
  const email = tenant.contact_email || tenant.email || ''
  const phone = tenant.contact_phone || tenant.phone || ''
  const addr = [
    tenant.address,
    [tenant.postal_code || tenant.invoice_zip, tenant.city || tenant.invoice_city].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(', ')
  const owner = [
    tenant.contact_person_first_name || tenant.first_name,
    tenant.contact_person_last_name || tenant.last_name,
  ]
    .filter(Boolean)
    .join(' ')
  const legalForm = tenant.legal_form || tenant.company_type
  return `
<section>
  <h1>Impressum</h1>
  <p><strong>${escapeHtml(name)}</strong></p>
  ${addr ? `<p>${escapeHtml(addr)}</p>` : ''}
  ${owner ? `<p>Vertreten durch: ${escapeHtml(owner)}</p>` : ''}
  ${legalForm ? `<p>Rechtsform: ${escapeHtml(String(legalForm))}</p>` : ''}
  ${tenant.uid_number ? `<p>UID: ${escapeHtml(String(tenant.uid_number))}</p>` : ''}
  ${
    tenant.mwst_obligated === true
      ? '<p>MWST-pflichtig</p>'
      : tenant.mwst_obligated === false
        ? '<p>Nicht MWST-pflichtig</p>'
        : ''
  }
  ${tenant.handelsregister_nr ? `<p>Handelsregister: ${escapeHtml(String(tenant.handelsregister_nr))}</p>` : ''}
  ${email ? `<p>E-Mail: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>` : ''}
  ${phone ? `<p>Telefon: <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>` : ''}
  <p>Schweiz</p>
</section>`.trim()
}

export function buildDatenschutzHtml(tenant: {
  name?: string | null
  contact_email?: string | null
  email?: string | null
}): string {
  const name = tenant.name || 'dieses Unternehmen'
  const email = tenant.contact_email || tenant.email || ''
  return `
<section>
  <h1>Datenschutzerklärung</h1>
  <p>Verantwortlich für die Datenbearbeitung auf dieser Website ist <strong>${escapeHtml(name)}</strong>${
    email ? ` (<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>)` : ''
  }.</p>
  <h2>Welche Daten wir bearbeiten</h2>
  <p>Beim Besuch der Website fallen technisch notwendige Server-Logdaten an (z.&nbsp;B. IP-Adresse, Zeitpunkt, Browser). Wenn Sie das Kontaktformular nutzen, speichern wir die von Ihnen angegebenen Angaben zur Bearbeitung Ihrer Anfrage.</p>
  <h2>Zweck und Rechtsgrundlage</h2>
  <p>Die Bearbeitung erfolgt zur Bereitstellung der Website, zur Kommunikation mit Interessentinnen und Interessenten sowie zur Abwicklung von Buchungen. Rechtsgrundlage ist unser berechtigtes Interesse bzw. die Vertragserfüllung (nLPD / DSG).</p>
  <h2>Weitergabe</h2>
  <p>Für Hosting, Buchungssystem und allenfalls Analyse können Auftragsbearbeiter eingesetzt werden. Eine Weitergabe erfolgt nur, soweit für den Betrieb erforderlich.</p>
  <h2>Speicherdauer</h2>
  <p>Kontaktdaten werden so lange gespeichert, wie es für die Bearbeitung Ihrer Anfrage bzw. gesetzliche Aufbewahrungspflichten nötig ist.</p>
  <h2>Ihre Rechte</h2>
  <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Bearbeitung sowie auf Widerspruch. Melden Sie sich dazu unter der oben genannten Kontaktadresse.</p>
</section>`.trim()
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
