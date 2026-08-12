/**
 * World-class local SEO defaults for tenant websites (CH SMB / Fahrschule).
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
) {
  const du = formal === 'du'
  const where = city ? ` in ${city}` : ''
  const isDriving =
    String(businessType || '').toLowerCase().includes('driv') ||
    String(businessType || '').toLowerCase().includes('fahr') ||
    businessType === 'driving_school'

  if (isDriving) {
    return du
      ? [
          {
            q: `Wie buche ich eine Fahrstunde bei ${name}?`,
            a: `Über die Online-Buchung auf dieser Seite wählst du Zeit und Ort und buchst direkt. ${name} bestätigt deinen Termin automatisch.`,
          },
          {
            q: 'Wieviele Fahrstunden brauche ich bis zur Prüfung?',
            a: 'Das ist individuell und hängt von Alter, Erfahrung und Lerntempo ab. Viele Schülerinnen und Schüler brauchen rund 15–30 Fahrlektionen — mit regelmässigem privaten Üben oft weniger. Ohne private Übungsfahrten kann es deutlich mehr sein. Wir beraten dich nach den ersten Lektionen ehrlich.',
          },
          {
            q: 'Wie kann ich meine Fahrausbildung beschleunigen?',
            a: 'Optimal sind 2–4 Fahrten pro Woche: zum Beispiel eine Fahrlektion plus private Übungsfahrten. Setze die Tipps deines Fahrlehrers konsequent um — so entstehen Automatismen schneller. Gegen Prüfungsdatum lohnt es sich, die Abstände der Lektionen wieder zu verkürzen.',
          },
          {
            q: 'Brauche ich einen Lernfahrausweis?',
            a: 'Für praktische Fahrstunden brauchst du in der Regel einen gültigen Lernfahrausweis der entsprechenden Kategorie. Den beantragst du beim Strassenverkehrsamt deines Kantons (inkl. Sehtest, Passfoto und ggf. Nothelferausweis). Details klären wir gerne vor der ersten Lektion.',
          },
          {
            q: 'Wie lange ist der Lernfahrausweis gültig?',
            a: 'Der Lernfahrausweis ist in der Regel 24 Monate ab Ausstellungsdatum gültig und kann einmalig um weitere 24 Monate verlängert werden, sofern noch keine Prüfung abgelegt wurde. Am effizientesten ist eine Ausbildung innerhalb von ca. 12 Monaten.',
          },
          {
            q: 'Ab welchem Alter kann ich starten?',
            a: 'Lernfahrten fürs Auto (Kat. B) sind ab dem 17. Geburtstag möglich — der Lernfahrausweis kann früher beantragt werden (je nach Kanton oft ca. 2 Monate vorher). Für kleinere Motorradkategorien gelten tiefere Altersgrenzen. Frag uns für deine Kategorie nach.',
          },
          {
            q: 'Automatik oder Schaltung — was soll ich wählen?',
            a: `Rechtlich darfst du nach bestandener Prüfung beides fahren, unabhängig vom Getriebe in der Prüfung. ${name} zeigt die verfügbaren Varianten und Preise im Angebot — du buchst, was zu dir passt.`,
          },
          {
            q: 'Warum dauern Fahrstunden oft 45 Minuten?',
            a: 'Nach etwa 45 Minuten lässt die Konzentration bei den meisten Menschen nach — deshalb ist das die übliche Grundeinheit. Je nach Thema und Gebiet können längere Lektionen (z. B. 90 Minuten) sinnvoll sein.',
          },
          {
            q: 'Was gilt für private Lernfahrten?',
            a: 'Private Übungsfahrten sind wertvoll, aber die ersten Versuche gehören in die Fahrschule. Die Begleitperson braucht einen gültigen Ausweis der Kategorie (oder höher), muss nüchtern und fahrfähig sein — beim Auto zusätzlich mind. 23 Jahre alt und die Prüfung vor mind. 3 Jahren bestanden haben. Die Handbremse muss für die Begleitperson erreichbar und wirksam sein.',
          },
          {
            q: `Kann ich eine Fahrstunde absagen oder verschieben?`,
            a: `Ja — innerhalb der hinterlegten Fristen kannst du Termine online absagen oder umbuchen.`,
          },
          {
            q: 'Wie kann ich bezahlen?',
            a: 'Je nach Angebot zahlst du online (z. B. Twint, Karte), bar oder per Rechnung. Schweizer QR-Rechnungen sind möglich.',
          },
          {
            q: `Wo findet der Unterricht${where} statt?`,
            a: city
              ? `Der Unterricht startet an den Standorten von ${name} in und um ${city}. Den genauen Treffpunkt siehst du bei der Buchung — flexible Treffpunkte sind oft möglich.`
              : `Den genauen Treffpunkt siehst du bei der Buchung. ${name} meldet sich bei Bedarf mit Details.`,
          },
        ]
      : [
          {
            q: `Wie buche ich eine Fahrstunde bei ${name}?`,
            a: `Über die Online-Buchung auf dieser Seite wählen Sie Zeit und Ort und buchen direkt. ${name} bestätigt Ihren Termin automatisch.`,
          },
          {
            q: 'Wieviele Fahrstunden brauche ich bis zur Prüfung?',
            a: 'Das ist individuell und hängt von Alter, Erfahrung und Lerntempo ab. Viele Schülerinnen und Schüler benötigen rund 15–30 Fahrlektionen — mit regelmässigem privaten Üben oft weniger. Ohne private Übungsfahrten kann es deutlich mehr sein. Wir beraten Sie nach den ersten Lektionen ehrlich.',
          },
          {
            q: 'Wie kann ich meine Fahrausbildung beschleunigen?',
            a: 'Optimal sind 2–4 Fahrten pro Woche: zum Beispiel eine Fahrlektion plus private Übungsfahrten. Setzen Sie die Tipps Ihres Fahrlehrers konsequent um — so entstehen Automatismen schneller. Gegen Prüfungsdatum lohnt es sich, die Abstände der Lektionen wieder zu verkürzen.',
          },
          {
            q: 'Brauche ich einen Lernfahrausweis?',
            a: 'Für praktische Fahrstunden benötigen Sie in der Regel einen gültigen Lernfahrausweis der entsprechenden Kategorie. Den beantragen Sie beim Strassenverkehrsamt Ihres Kantons (inkl. Sehtest, Passfoto und ggf. Nothelferausweis). Details klären wir gerne vor der ersten Lektion.',
          },
          {
            q: 'Wie lange ist der Lernfahrausweis gültig?',
            a: 'Der Lernfahrausweis ist in der Regel 24 Monate ab Ausstellungsdatum gültig und kann einmalig um weitere 24 Monate verlängert werden, sofern noch keine Prüfung abgelegt wurde. Am effizientesten ist eine Ausbildung innerhalb von ca. 12 Monaten.',
          },
          {
            q: 'Ab welchem Alter kann ich starten?',
            a: 'Lernfahrten fürs Auto (Kat. B) sind ab dem 17. Geburtstag möglich — der Lernfahrausweis kann früher beantragt werden (je nach Kanton oft ca. 2 Monate vorher). Für kleinere Motorradkategorien gelten tiefere Altersgrenzen. Fragen Sie uns für Ihre Kategorie nach.',
          },
          {
            q: 'Automatik oder Schaltung — was soll ich wählen?',
            a: `Rechtlich dürfen Sie nach bestandener Prüfung beides fahren, unabhängig vom Getriebe in der Prüfung. ${name} zeigt die verfügbaren Varianten und Preise im Angebot — Sie buchen, was zu Ihnen passt.`,
          },
          {
            q: 'Warum dauern Fahrstunden oft 45 Minuten?',
            a: 'Nach etwa 45 Minuten lässt die Konzentration bei den meisten Menschen nach — deshalb ist das die übliche Grundeinheit. Je nach Thema und Gebiet können längere Lektionen (z. B. 90 Minuten) sinnvoll sein.',
          },
          {
            q: 'Was gilt für private Lernfahrten?',
            a: 'Private Übungsfahrten sind wertvoll, aber die ersten Versuche gehören in die Fahrschule. Die Begleitperson braucht einen gültigen Ausweis der Kategorie (oder höher), muss nüchtern und fahrfähig sein — beim Auto zusätzlich mind. 23 Jahre alt und die Prüfung vor mind. 3 Jahren bestanden haben. Die Handbremse muss für die Begleitperson erreichbar und wirksam sein.',
          },
          {
            q: `Kann ich eine Fahrstunde absagen oder verschieben?`,
            a: `Ja — innerhalb der hinterlegten Fristen können Sie Termine online absagen oder umbuchen.`,
          },
          {
            q: 'Wie kann ich bezahlen?',
            a: 'Je nach Angebot zahlen Sie online (z. B. Twint, Karte), bar oder per Rechnung. Schweizer QR-Rechnungen sind möglich.',
          },
          {
            q: `Wo findet der Unterricht${where} statt?`,
            a: city
              ? `Der Unterricht startet an den Standorten von ${name} in und um ${city}. Den genauen Treffpunkt sehen Sie bei der Buchung — flexible Treffpunkte sind oft möglich.`
              : `Den genauen Treffpunkt sehen Sie bei der Buchung. ${name} meldet sich bei Bedarf mit Details.`,
          },
        ]
  }

  return du
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
