/**
 * World-class local SEO defaults for tenant websites (CH SMB, industry-aware).
 * Prefer local intent (business + city) over SaaS booking jargon.
 */
import { getTerminologyDefaults, type Terminology } from '~/composables/useTerminology'

export type LocalSeoContext = {
  name: string
  business_type?: string | null
  city?: string | null
  address?: string | null
  categories?: string[] | null
  formal_address?: 'sie' | 'du'
}

function sliceChars(s: string, max: number) {
  const t = s.trim()
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`
}

/** Extract Swiss city from free-form address (e.g. "Musterweg 2, 8000 Zürich"). */
export function extractCityFromAddress(address?: string | null, city?: string | null): string {
  if (city?.trim()) return city.trim()
  const addr = String(address || '')
  const m = addr.match(/\b\d{4}\s+([A-Za-zÄÖÜäöüÉéÈèÊêÂâÎîÔôÛûçÇ'’\-\s]+)\b/)
  if (m?.[1]) return m[1].trim().split(',')[0].trim()
  return ''
}

const LOCATION_NAME_PREFIX = /^(hauptstandort|standort|filiale|büro|hq|sitz)\s+/i
const LOCATION_VENUE_NAME = /^(bahnhof|haltestelle|pickup|zuhause|treffpunkt|parkplatz|tram|bus|sbb|home)\b/i

/** tenants.city does not exist — city lives in invoice_city or the address line. */
export function resolveWebsiteCity(tenant?: {
  city?: string | null
  invoice_city?: string | null
  address?: string | null
} | null): string {
  if (!tenant) return ''
  return (
    extractCityFromAddress(tenant.address, tenant.city || tenant.invoice_city) ||
    String(tenant.invoice_city || tenant.city || '').trim()
  )
}

/** Prefer locations.city / address — never publish venue nicknames as a city page. */
export function resolveLocationCity(loc: {
  name?: string | null
  address?: string | null
  city?: string | null
}): string {
  const fromField = String(loc.city || '').trim()
  if (fromField) return fromField
  const fromAddr = extractCityFromAddress(loc.address)
  if (fromAddr) return fromAddr
  const raw = String(loc.name || '').trim()
  if (!LOCATION_NAME_PREFIX.test(raw)) return ''
  const stripped = raw.replace(LOCATION_NAME_PREFIX, '').trim()
  if (!stripped || LOCATION_VENUE_NAME.test(stripped) || stripped.split(/\s+/).length > 3) return ''
  return stripped
}

export function schemaBusinessType(businessType?: string | null): string | string[] {
  const t = String(businessType || '').toLowerCase()
  if (t === 'driving_school' || t.includes('driv') || t.includes('fahr')) {
    return ['DrivingSchool', 'LocalBusiness']
  }
  if (t.includes('music') || t.includes('musik')) return ['MusicSchool', 'LocalBusiness']
  if (t.includes('tutor') || t.includes('nachhilfe')) return ['EducationalOrganization', 'LocalBusiness']
  if (t.includes('therap') || t.includes('coach') || t.includes('mental')) {
    return ['ProfessionalService', 'LocalBusiness']
  }
  if (t.includes('fit') || t.includes('sport')) return ['SportsActivityLocation', 'LocalBusiness']
  return 'LocalBusiness'
}

export function buildLocalSeoDefaults(ctx: LocalSeoContext) {
  const terms = getTerminologyDefaults(ctx.business_type)
  const name = (ctx.name || terms.businessNoun).trim()
  const city = extractCityFromAddress(ctx.address, ctx.city)
  const cats = (ctx.categories || []).filter(Boolean).slice(0, 3)
  const primaryCat = cats[0] || ''
  const formal = ctx.formal_address === 'du' ? 'du' : 'sie'

  // Swiss local SEO title: keyword + geo first, brand at end (≤60)
  // e.g. "Fahrschule Zürich | Fahrschule Muster"
  let title: string
  if (city) {
    title = `${terms.businessNoun} ${city} | ${name}`
    if (title.length > 60) title = `${terms.businessNoun} ${city} | ${sliceChars(name, 24)}`
  } else {
    title = `${name} | ${terms.businessNoun} Schweiz`
  }
  title = sliceChars(title, 60)

  // Meta description: local + offer + CTA (≤160)
  const offerBit = primaryCat
    ? `${primaryCat}, ${terms.appointmentsPlural}`
    : terms.appointmentsPlural
  const where = city ? ` in ${city}` : ' in der Schweiz'
  let description = `${name}${where}: ${offerBit} mit klaren Preisen. ${terms.bookAction} online — Erinnerungen inklusive.`
  description = sliceChars(description, 160)

  const keywords = [
    city ? `${terms.businessNoun.toLowerCase()} ${city.toLowerCase()}` : terms.businessNoun.toLowerCase(),
    name.toLowerCase(),
    terms.appointmentsPlural.toLowerCase(),
    terms.bookAction.toLowerCase(),
    ...cats.map((c) => c.toLowerCase()),
    city ? `${terms.appointment.toLowerCase()} ${city.toLowerCase()}` : null,
    'schweiz',
  ]
    .filter(Boolean)
    .join(', ')

  // H1: local service intent (brand stays visually dominant via brand signal)
  const headline = city
    ? `${terms.businessNoun} ${city} — ${terms.appointmentsPlural}`
    : `${terms.businessNoun} — ${terms.appointmentsPlural}`

  const bio =
    formal === 'du'
      ? city
        ? `${name} in ${city}: professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. Du buchst online in wenigen Klicks — inkl. Erinnerungen. Ob Einstieg oder Prüfung: ${name} bringt dich sicher ans Ziel.`
        : `${name}: professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. Du buchst online in wenigen Klicks — inkl. Erinnerungen. Ob Einstieg oder Prüfung: ${name} bringt dich sicher ans Ziel.`
      : city
        ? `${name} in ${city}: professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. Buchen Sie online in wenigen Klicks — inkl. Erinnerungen. Ob Einstieg oder Prüfung: ${name} bringt Sie sicher ans Ziel.`
        : `${name}: professionelle ${terms.appointmentsPlural} mit klaren Preisen und persönlicher Begleitung. Buchen Sie online in wenigen Klicks — inkl. Erinnerungen. Ob Einstieg oder Prüfung: ${name} bringt Sie sicher ans Ziel.`


  return {
    terms,
    name,
    city,
    title,
    description,
    keywords,
    headline,
    bio,
  }
}

export function buildLocalFaqs(
  terms: Terminology,
  name: string,
  formal: 'sie' | 'du' = 'sie',
  businessType?: string | null,
  city?: string | null,
  serviceNames?: string[] | null,
  pickup?: boolean,
) {
  const du = formal === 'du'
  const where = city ? ` in ${city}` : ''
  const isDriving =
    String(businessType || '').toLowerCase().includes('driv') ||
    String(businessType || '').toLowerCase().includes('fahr') ||
    businessType === 'driving_school'

  if (isDriving) {
    const categoryFaq = serviceNames?.length
      ? {
          q: `Welche Kategorien bietet ${name}${where} an?`,
          a: du
            ? `${name} bietet unter anderem ${serviceNames.slice(0, 5).join(', ')}. Preise und nächste Termine siehst du direkt auf dieser Website.`
            : `${name} bietet unter anderem ${serviceNames.slice(0, 5).join(', ')}. Preise und nächste Termine sehen Sie direkt auf dieser Website.`,
        }
      : null
    return [
      {
        q: `Wie buche ich eine Fahrstunde bei ${name}?`,
        a: du
          ? `Über die Online-Buchung auf dieser Seite wählst du Zeit und Ort und buchst direkt. ${name} bestätigt deinen Termin automatisch.`
          : `Über die Online-Buchung auf dieser Seite wählen Sie Zeit und Ort und buchen direkt. ${name} bestätigt Ihren Termin automatisch.`,
      },
      {
        q: 'Wieviele Fahrstunden brauche ich bis zur Prüfung?',
        a: du
          ? 'Das ist individuell und hängt von Alter, Erfahrung und Lerntempo ab. Viele Schülerinnen und Schüler brauchen rund 15–30 Fahrlektionen — mit regelmässigem privaten Üben oft weniger. Wir beraten dich nach den ersten Lektionen ehrlich.'
          : 'Das ist individuell und hängt von Alter, Erfahrung und Lerntempo ab. Viele Schülerinnen und Schüler benötigen rund 15–30 Fahrlektionen — mit regelmässigem privaten Üben oft weniger. Wir beraten Sie nach den ersten Lektionen ehrlich.',
      },
      {
        q: 'Brauche ich einen Lernfahrausweis?',
        a: du
          ? 'Für praktische Fahrstunden brauchst du in der Regel einen gültigen Lernfahrausweis der entsprechenden Kategorie. Den beantragst du beim Strassenverkehrsamt deines Kantons. Details klären wir gerne vor der ersten Lektion.'
          : 'Für praktische Fahrstunden benötigen Sie in der Regel einen gültigen Lernfahrausweis der entsprechenden Kategorie. Den beantragen Sie beim Strassenverkehrsamt Ihres Kantons. Details klären wir gerne vor der ersten Lektion.',
      },
      {
        q: 'Kann ich eine Fahrstunde absagen oder verschieben?',
        a: du
          ? 'Ja — innerhalb der hinterlegten Fristen kannst du Termine online absagen oder umbuchen.'
          : 'Ja — innerhalb der hinterlegten Fristen können Sie Termine online absagen oder umbuchen.',
      },
      {
        q: `Wo findet der Unterricht${where} statt?`,
        a: pickup
          ? du
            ? `Du wählst bei der Buchung einen festen Treffpunkt — oder trägst einen Wunschort im Radius ein. Liegt die Adresse ausserhalb, nimmst du einen der Treffpunkte von ${name}.`
            : `Sie wählen bei der Buchung einen festen Treffpunkt — oder tragen einen Wunschort im Radius ein. Liegt die Adresse ausserhalb, nehmen Sie einen der Treffpunkte von ${name}.`
          : city
            ? du
              ? `Der Unterricht startet an den Standorten von ${name} in und um ${city}. Den genauen Treffpunkt siehst du bei der Buchung.`
              : `Der Unterricht startet an den Standorten von ${name} in und um ${city}. Den genauen Treffpunkt sehen Sie bei der Buchung.`
            : du
              ? `Den genauen Treffpunkt siehst du bei der Buchung. ${name} meldet sich bei Bedarf mit Details.`
              : `Den genauen Treffpunkt sehen Sie bei der Buchung. ${name} meldet sich bei Bedarf mit Details.`,
      },
      ...(pickup
        ? [
            {
              q: 'Kann ich einen eigenen Treffpunkt angeben?',
              a: du
                ? `Ja, wenn die Adresse im hinterlegten Umkreis liegt. Bei der Buchung trägst du den Wunschort ein. Sonst wählst du einen festen Treffpunkt.`
                : `Ja, wenn die Adresse im hinterlegten Umkreis liegt. Bei der Buchung tragen Sie den Wunschort ein. Sonst wählen Sie einen festen Treffpunkt.`,
            },
          ]
        : []),
      ...(categoryFaq ? [categoryFaq] : []),
    ]
  }

  const base = du
    ? [
        {
          q: `Wie buche ich eine ${terms.appointment}?`,
          a: `Über die Online-Buchung auf dieser Seite wählst du einen freien Slot und buchst direkt. ${name} bestätigt den Termin automatisch.`,
        },
        {
          q: `Kann ich eine ${terms.appointment} absagen oder umbuchen?`,
          a: `Ja — innerhalb der von ${name} hinterlegten Fristen kannst du Termine online absagen oder verschieben.`,
        },
        {
          q: 'Wie funktioniert die Bezahlung?',
          a: 'Je nach Angebot zahlst du vor Ort, per Rechnung oder online. Schweizer QR-Rechnungen sind möglich.',
        },
        {
          q: `Für wen ist ${name} geeignet?`,
          a: `${name} richtet sich an ${terms.clientsPlural}, die unkompliziert ${terms.appointmentsPlural} online buchen möchten.`,
        },
        {
          q: 'Muss ich mich vorher registrieren?',
          a: 'Oft reicht die Buchung mit den wichtigsten Kontaktdaten. Falls ein Kundenkonto nötig ist, führt dich der Buchungsflow durch die wenigen Schritte.',
        },
        {
          q: 'Wie erhalte ich eine Bestätigung?',
          a: 'Nach der Buchung erhältst du eine Bestätigung — je nach Einstellung per E-Mail und/oder SMS, inklusive Erinnerungen vor dem Termin.',
        },
      ]
    : [
        {
          q: `Wie buche ich eine ${terms.appointment}?`,
          a: `Über die Online-Buchung auf dieser Seite wählen Sie einen freien Slot und buchen direkt. ${name} bestätigt den Termin automatisch.`,
        },
        {
          q: `Kann ich eine ${terms.appointment} absagen oder umbuchen?`,
          a: `Ja — innerhalb der von ${name} hinterlegten Fristen können Sie Termine online absagen oder verschieben.`,
        },
        {
          q: 'Wie funktioniert die Bezahlung?',
          a: 'Je nach Angebot zahlen Sie vor Ort, per Rechnung oder online. Schweizer QR-Rechnungen sind möglich.',
        },
        {
          q: `Für wen ist ${name} geeignet?`,
          a: `${name} richtet sich an ${terms.clientsPlural}, die unkompliziert ${terms.appointmentsPlural} online buchen möchten.`,
        },
        {
          q: 'Muss ich mich vorher registrieren?',
          a: 'Oft reicht die Buchung mit den wichtigsten Kontaktdaten. Falls ein Kundenkonto nötig ist, führt Sie der Buchungsflow durch die wenigen Schritte.',
        },
        {
          q: 'Wie erhalte ich eine Bestätigung?',
          a: 'Nach der Buchung erhalten Sie eine Bestätigung — je nach Einstellung per E-Mail und/oder SMS, inklusive Erinnerungen vor dem Termin.',
        },
      ]
  const pickupFaq = pickup
    ? [
        {
          q: 'Kann ich einen eigenen Treffpunkt angeben?',
          a: du
            ? 'Ja, wenn die Adresse im hinterlegten Umkreis liegt. Bei der Buchung trägst du den Wunschort ein. Sonst wählst du einen festen Treffpunkt.'
            : 'Ja, wenn die Adresse im hinterlegten Umkreis liegt. Bei der Buchung tragen Sie den Wunschort ein. Sonst wählen Sie einen festen Treffpunkt.',
        },
      ]
    : []
  return [...base, ...pickupFaq]
}

/** Rewrite schema graph URLs when the public canonical host differs from baked siteUrl. */
export function rewriteLandingSchemaUrls(schema: any, fromUrl: string, toUrl: string) {
  if (!schema || !fromUrl || !toUrl || fromUrl === toUrl) return schema
  try {
    const raw = JSON.stringify(schema)
    const next = raw.split(fromUrl).join(toUrl)
    return JSON.parse(next)
  } catch {
    return schema
  }
}
