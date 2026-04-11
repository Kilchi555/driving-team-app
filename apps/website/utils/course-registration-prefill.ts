import type { LocationQuery } from 'vue-router'

/** Felder, die aus der URL in das Kurs-Anmeldeformular übernommen werden können */
export interface CourseRegistrationContactPrefill {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  birthdate?: string
  faberid?: string
  street?: string
  street_nr?: string
  zip?: string
  city?: string
  company?: string
  notes?: string
}

function firstQueryValue(q: LocationQuery, keys: string[]): string {
  for (const k of keys) {
    const v = q[k]
    if (v == null) continue
    const raw = Array.isArray(v) ? v[0] : v
    if (raw == null) continue
    const s = String(raw).trim()
    if (s) return s
  }
  return ''
}

/** dd.mm.jjjj oder dd.mm.jj → yyyy-mm-dd (für input type=date) */
function normalizeBirthdateForInput(raw: string): string {
  const t = raw.trim()
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (iso.test(t)) return t
  const ch = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/.exec(t)
  if (!ch) return t
  let d = Number(ch[1])
  let m = Number(ch[2])
  let y = Number(ch[3])
  if (y < 100) y += y >= 30 ? 1900 : 2000
  if (d < 1 || d > 31 || m < 1 || m > 12) return t
  const mm = String(m).padStart(2, '0')
  const dd = String(d).padStart(2, '0')
  return `${y}-${mm}-${dd}`
}

/**
 * Liest typische Marketing-/Mail-Link-Parameter (de/en, kurz/lang).
 * Auf Vercel-Preview greift kein localhost-Autofill — explizite Query-URLs bleiben portabel.
 */
export function parseCourseRegistrationQuery(q: LocationQuery): CourseRegistrationContactPrefill {
  const first_name = firstQueryValue(q, ['vorname', 'first_name', 'firstname', 'given_name'])
  const last_name = firstQueryValue(q, ['nachname', 'last_name', 'lastname', 'family_name'])
  const email = firstQueryValue(q, ['email', 'mail'])
  const phone = firstQueryValue(q, ['phone', 'tel', 'telefon', 'mobile'])
  const birthRaw = firstQueryValue(q, ['birthdate', 'geburtsdatum', 'geburtstag', 'bday'])
  const birthdate = birthRaw ? normalizeBirthdateForInput(birthRaw) : ''
  const faberid = firstQueryValue(q, ['faberid', 'faber_id', 'fuehrerausweis', 'fuehrerausweisnr'])
  const street = firstQueryValue(q, ['street', 'strasse', 'address', 'adresse'])
  const street_nr = firstQueryValue(q, ['street_nr', 'hausnr', 'nr', 'street_number', 'hausnummer'])
  const zip = firstQueryValue(q, ['zip', 'plz', 'postal_code'])
  const city = firstQueryValue(q, ['city', 'ort', 'stadt'])
  const company = firstQueryValue(q, ['company', 'firma', 'organization'])
  const notes = firstQueryValue(q, ['notes', 'bemerkungen', 'message'])

  const out: CourseRegistrationContactPrefill = {}
  if (first_name) out.first_name = first_name
  if (last_name) out.last_name = last_name
  if (email) out.email = email
  if (phone) out.phone = phone
  if (birthdate) out.birthdate = birthdate
  if (faberid) out.faberid = faberid
  if (street) out.street = street
  if (street_nr) out.street_nr = street_nr
  if (zip) out.zip = zip
  if (city) out.city = city
  if (company) out.company = company
  if (notes) out.notes = notes
  return out
}
