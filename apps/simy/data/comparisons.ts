import { STARTING_PRICE_CHF, registerUrl } from './pricing'

export type ComparisonRow = {
  feature: string
  competitor: string
  simy: string
  winner: 'simy' | 'competitor' | 'tie'
}

export type ComparisonFaq = { q: string; a: string }

export type SimyComparison = {
  slug: string
  competitorName: string
  /** SEO */
  title: string
  description: string
  keywords: string
  /** Hero */
  badge: string
  h1: string
  h1Highlight: string
  /** 40–60 word citation-ready summary */
  verdict: string
  heroSub: string
  /** Positioning */
  bestForCompetitor: string
  bestForSimy: string
  rows: ComparisonRow[]
  prosCompetitor: string[]
  prosSimy: string[]
  faqs: ComparisonFaq[]
  schemaName: string
}

export const COMPARISONS: SimyComparison[] = [
  {
    slug: 'calendly-alternative',
    competitorName: 'Calendly',
    title: 'Calendly Alternative Schweiz 2026 – Simy im Vergleich',
    description:
      'Calendly Alternative für die Schweiz: Online-Buchung plus QR-Rechnung, TWINT, Team-App und Kundenverwaltung. Ehrlicher Vergleich — 30 Tage kostenlos.',
    keywords:
      'calendly alternative, calendly alternative schweiz, calendly vs simy, terminbuchung software schweiz, calendly ersetzen',
    badge: 'Vergleich · Calendly Alternative',
    h1: 'Calendly Alternative',
    h1Highlight: 'für die Schweiz',
    verdict:
      'Calendly ist stark als reiner Terminplaner. Simy ist die bessere Calendly-Alternative für Schweizer Selbständige und KMUs, die neben Buchung auch QR-Rechnungen, TWINT, Kundenverwaltung und eine Mitarbeiter-App brauchen — ohne Tool-Zoo.',
    heroSub:
      'Du suchst eine Calendly-Alternative mit Schweizer Abrechnung? Hier der direkte Vergleich — ehrlich, ohne Marketing-Floskeln.',
    bestForCompetitor:
      'Solo-Termine weltweit, einfache Scheduling-Links, wenn Abrechnung und Team-Ops egal sind.',
    bestForSimy:
      'Schweizer Dienstleister bis ~20 MA: Buchung, Rechnung, TWINT/QR, Kunden und Team in einer App.',
    rows: [
      { feature: 'Online-Terminbuchung', competitor: 'Sehr stark', simy: 'Sehr stark', winner: 'tie' },
      { feature: 'QR-Rechnung (Schweiz)', competitor: 'Nein', simy: 'Ja', winner: 'simy' },
      { feature: 'TWINT / PostFinance', competitor: 'Nein', simy: 'Ja', winner: 'simy' },
      { feature: 'Kundenverwaltung', competitor: 'Begrenzt', simy: 'Voll', winner: 'simy' },
      { feature: 'Mitarbeiter-App', competitor: 'Eingeschränkt', simy: 'Ja (iOS/Android)', winner: 'simy' },
      { feature: 'SMS-Erinnerungen', competitor: 'Ja (Plan)', simy: 'Ja', winner: 'tie' },
      { feature: 'Hosting / Datenschutz CH', competitor: 'US/EU-fokussiert', simy: 'Schweizer Fokus', winner: 'simy' },
      { feature: 'Branchen-Vorlagen', competitor: 'Generisch', simy: 'Coaching, Consulting, Fahrschule, …', winner: 'simy' },
      { feature: 'Preis Einstieg', competitor: 'Freemium / Pläne', simy: `ab CHF ${STARTING_PRICE_CHF}/Mt.`, winner: 'tie' },
    ],
    prosCompetitor: [
      'Weltweit bekannt, schnelles Scheduling',
      'Viele Integrationen (Zoom, CRM, …)',
      'Einfacher Einstieg für Solo',
    ],
    prosSimy: [
      'Buchung + Schweizer Abrechnung in einem System',
      'TWINT, QR-IBAN, PostFinance integriert',
      'Team, App und Branchen-Workflows ohne Tool-Zoo',
    ],
    faqs: [
      {
        q: 'Ist Simy eine echte Calendly-Alternative?',
        a: 'Ja — wenn du mehr brauchst als Terminslots. Simy ersetzt Calendly plus oft Excel, Word und Banking-App: Buchung, Kunden, QR-Rechnung und TWINT.',
      },
      {
        q: 'Kann ich von Calendly zu Simy wechseln?',
        a: 'Ja. Du richtest Verfügbarkeiten und Buchungslink neu ein; Kunden übernimmst du schrittweise. 30 Tage testen ohne Kreditkarte.',
      },
      {
        q: 'Für wen bleibt Calendly besser?',
        a: 'Wenn du nur globale Discovery-Calls planst und keine Schweizer Rechnungen oder Team-Ops brauchst, reicht Calendly oft.',
      },
      {
        q: 'Wo liegen die Daten?',
        a: 'Simy ist auf Schweizer Anforderungen ausgelegt (DSG/DSGVO, Schweizer Server). Calendly ist ein US-Produkt mit internationalen Rechenzentren.',
      },
    ],
    schemaName: 'Simy vs Calendly – Calendly Alternative Schweiz',
  },
  {
    slug: 'terminli',
    competitorName: 'Terminli',
    title: 'Simy vs Terminli 2026 – Vergleich Terminbuchung Schweiz',
    description:
      'Simy oder Terminli? Vergleich der Schweizer Terminbuchung: All-in-One mit Rechnungen, Team-App und TWINT vs. schlanke Solo-Buchung. 30 Tage gratis testen.',
    keywords:
      'terminli alternative, simy vs terminli, terminli vergleich, online terminbuchung schweiz, online buchungssystem schweiz',
    badge: 'Vergleich · Simy vs Terminli',
    h1: 'Simy vs Terminli',
    h1Highlight: 'Welches passt?',
    verdict:
      'Terminli ist eine schlanke Schweizer Terminbuchung für Solo und kleine Teams. Simy ist die All-in-One-Alternative: Buchung plus QR-Rechnung, TWINT, Kundenverwaltung, Mitarbeiter-App und optionales Marketing — für Betriebe, die Admin automatisieren wollen.',
    heroSub:
      'Beide aus der Schweiz. Der Unterschied: Terminli fokussiert Buchung — Simy den ganzen Betrieb.',
    bestForCompetitor:
      'Solo-Selbständige, die nur eine einfache, günstige Buchungsseite wollen.',
    bestForSimy:
      'KMUs und Selbständige, die Buchung, Abrechnung und Team in einem System brauchen.',
    rows: [
      { feature: 'Online-Terminbuchung', competitor: 'Ja', simy: 'Ja', winner: 'tie' },
      { feature: 'Schweizer Hosting', competitor: 'Ja (Genf)', simy: 'Ja', winner: 'tie' },
      { feature: 'QR-Rechnung / TWINT', competitor: 'Begrenzt / Fokus Buchung', simy: 'Integriert', winner: 'simy' },
      { feature: 'Kundenverwaltung & Historie', competitor: 'Basis', simy: 'Voll', winner: 'simy' },
      { feature: 'Team / mehrere Mitarbeiter', competitor: 'Team-Pläne', simy: 'Seats + App', winner: 'simy' },
      { feature: 'Branchen-Workflows', competitor: 'Generisch', simy: 'Vorlagen pro Branche', winner: 'simy' },
      { feature: 'Marketing / SEO Add-on', competitor: 'Nein', simy: 'Optional', winner: 'simy' },
      { feature: 'Einstiegspreis', competitor: 'ca. CHF 35/Mt.', simy: `ab CHF ${STARTING_PRICE_CHF}/Mt.`, winner: 'competitor' },
    ],
    prosCompetitor: [
      'Sehr einfach, CH-first',
      'Günstiger Einstieg',
      'Hosting bei Infomaniak (Genf)',
    ],
    prosSimy: [
      'All-in-One: Buchung + Geld + Team',
      'TWINT, QR, Mahnungen, Guthaben',
      'Skaliert vom Solo bis ~20 MA',
    ],
    faqs: [
      {
        q: 'Wann ist Terminli die bessere Wahl?',
        a: 'Wenn du nur Online-Buchung brauchst, solo arbeitest und Abrechnung weiter separat machst — dann ist Terminli oft günstiger und schlanker.',
      },
      {
        q: 'Wann lohnt sich Simy gegenüber Terminli?',
        a: 'Sobald Rechnungen, TWINT, Team-Kalender oder App dazukommen. Dann sparst du mehrere Tools und doppelte Dateneingabe.',
      },
      {
        q: 'Sind beide DSG-konform?',
        a: 'Beide positionieren sich schweizbezogen. Simy betont Schweizer Server und DSG/DSGVO für Betriebsdaten inklusive Abrechnung.',
      },
      {
        q: 'Kann ich Simy 30 Tage testen?',
        a: 'Ja — ohne Kreditkarte. Danach monatlich kündbar.',
      },
    ],
    schemaName: 'Simy vs Terminli – Terminbuchung Schweiz Vergleich',
  },
  {
    slug: 'klara',
    competitorName: 'KLARA',
    title: 'Simy vs KLARA Online Terminbuchung – Vergleich 2026',
    description:
      'Simy oder KLARA Terminbuchung? Wann die Suite, wann die Betriebssoftware. Vergleich für Schweizer KMU: Buchung, Abrechnung, App. 30 Tage gratis.',
    keywords:
      'klara terminbuchung alternative, simy vs klara, klara online terminbuchung vergleich, buchungssystem schweiz',
    badge: 'Vergleich · Simy vs KLARA',
    h1: 'Simy vs KLARA',
    h1Highlight: 'Terminbuchung',
    verdict:
      'KLARA ist eine Schweizer Suite (Buchhaltung, Website, Kasse) mit Online-Terminbuchung als Modul. Simy ist spezialisierte Betriebssoftware für terminbasierte Dienstleister: Buchung, QR/TWINT, Kunden und Team-App — ohne dass du die ganze Suite brauchst.',
    heroSub:
      'Beide Schweizer. Die Frage: Brauchst du eine Suite — oder einen klaren Betriebs-Autopilot für Termine und Geld?',
    bestForCompetitor:
      'KMU, die bereits KLARA Buchhaltung/Website nutzen und Buchung «dazubuchen».',
    bestForSimy:
      'Termin-basierte Betriebe (Fahrschule, Coaching, Praxis…), die Ops und Abrechnung eng verzahnen wollen.',
    rows: [
      { feature: 'Online-Terminbuchung', competitor: 'Ja (Modul)', simy: 'Kernprodukt', winner: 'tie' },
      { feature: 'Vollständige Buchhaltung', competitor: 'Ja (Suite)', simy: 'Export / Treuhänder', winner: 'competitor' },
      { feature: 'QR-Rechnung & Online-Zahlung', competitor: 'Über Suite', simy: 'Im Produkt', winner: 'tie' },
      { feature: 'Branchenspezifische Workflows', competitor: 'Breit/generisch', simy: 'Stark (Branchen-Vorlagen)', winner: 'simy' },
      { feature: 'Mitarbeiter-App unterwegs', competitor: 'myKLARA App', simy: 'Native Ops-App', winner: 'tie' },
      { feature: 'Marketing / Ads Add-on', competitor: 'Partner-Ökosystem', simy: 'Optional integriert', winner: 'simy' },
      { feature: 'Fokus', competitor: 'Suite für KMU', simy: 'Terminbetrieb auf Autopilot', winner: 'tie' },
    ],
    prosCompetitor: [
      'Starke Marke, viele KMU kennen KLARA',
      'Buchhaltung + Buchung aus einer Hand',
      'Reserve with Google u. a. Integrationen',
    ],
    prosSimy: [
      'Gebaut um Termin-Ops, nicht als Modul',
      'Tiefere Branchen-Workflows',
      'Schneller Start ohne Suite-Komplexität',
    ],
    faqs: [
      {
        q: 'Ersetzt Simy KLARA Buchhaltung?',
        a: 'Nein. Simy deckt Betrieb und Abrechnung Richtung Kunden ab (Rechnung, TWINT, Export). Für vollständige Finanzbuchhaltung bleibst du bei Treuhänder oder einer Suite wie KLARA.',
      },
      {
        q: 'Wann KLARA, wann Simy?',
        a: 'Schon in der KLARA-Welt? Buchungsmodul prüfen. Primär Termine, Lektionen, Teams und Schweizer Kundenzahlungen? Dann ist Simy oft der direktere Fit.',
      },
      {
        q: 'Gibt es eine Testphase?',
        a: 'Simy: 30 Tage kostenlos ohne Kreditkarte. KLARA Online Terminbuchung bietet ebenfalls eine Testphase — Details bei KLARA.',
      },
    ],
    schemaName: 'Simy vs KLARA Online Terminbuchung',
  },
  {
    slug: 'simplybook',
    competitorName: 'SimplyBook.me',
    title: 'SimplyBook Alternative Schweiz – Simy im Vergleich 2026',
    description:
      'SimplyBook Alternative für die Schweiz: Vergleich mit Simy — CH-Hosting, QR-Rechnung, TWINT, Support auf Deutsch. 30 Tage kostenlos testen.',
    keywords:
      'simplybook alternative, simplybook alternative schweiz, simplybook vs simy, buchungssystem schweiz',
    badge: 'Vergleich · SimplyBook Alternative',
    h1: 'SimplyBook Alternative',
    h1Highlight: 'aus der Schweiz',
    verdict:
      'SimplyBook.me ist ein internationales Buchungssystem mit vielen Modulen. Simy ist die Schweizer Alternative für Dienstleister, die nDSG/CH-Hosting, QR-Rechnung, TWINT und deutschsprachigen Support erwarten — plus Branchen-Vorlagen statt generischem Feature-Zoo.',
    heroSub:
      'Internationales Booking-Tool oder Schweizer Betriebssoftware? Der Vergleich für KMUs und Selbständige.',
    bestForCompetitor:
      'Internationale Setups mit vielen Plugins und Marketplace-Logik.',
    bestForSimy:
      'Schweizer Selbständige und KMUs mit lokalem Zahlungsverkehr und Team vor Ort.',
    rows: [
      { feature: 'Online-Buchung & Reminder', competitor: 'Ja', simy: 'Ja', winner: 'tie' },
      { feature: 'Schweiz-first Billing (QR/TWINT)', competitor: 'Über Workarounds', simy: 'Native', winner: 'simy' },
      { feature: 'CH-Datenschutz / Support DE', competitor: 'International', simy: 'Schweiz / Deutsch', winner: 'simy' },
      { feature: 'Modul-/Plugin-Vielfalt', competitor: 'Sehr hoch', simy: 'Fokussiert', winner: 'competitor' },
      { feature: 'Branchen-Vorlagen CH', competitor: 'Global templates', simy: 'CH-Workflows', winner: 'simy' },
      { feature: 'Team & App', competitor: 'Ja', simy: 'Ja', winner: 'tie' },
      { feature: 'Komplexität', competitor: 'Hoch (Module)', simy: 'Schlank auf Ops', winner: 'simy' },
    ],
    prosCompetitor: [
      'Viele Branchen-Module weltweit',
      'Marketplace und Add-ons',
      'Bekanntes internationales Produkt',
    ],
    prosSimy: [
      'Schweizer Zahlungen out of the box',
      'Weniger Komplexität, klarer Workflow',
      'Support und Produktlogik für CH-KMU',
    ],
    faqs: [
      {
        q: 'Ist Simy günstiger als SimplyBook?',
        a: `Simy startet ab CHF ${STARTING_PRICE_CHF}/Monat. SimplyBook hat gestaffelte Pläne — entscheidend ist oft der Gesamtaufwand (Module, Zahlungsanbindung Schweiz), nicht nur der Listenpreis.`,
      },
      {
        q: 'Kann Simy SimplyBook für eine Massagepraxis ersetzen?',
        a: 'Ja, für Selbstzahler mit Online-Buchung, Reminder und QR-Rechnung — ohne Marktplatz-Provision. Siehe auch /massage.',
      },
      {
        q: 'Was ist der grösste Unterschied?',
        a: 'SimplyBook skaliert über Module global. Simy skaliert über Schweizer Betriebsalltag: Termin → Kunde → Zahlung → Team.',
      },
    ],
    schemaName: 'Simy vs SimplyBook.me – Alternative Schweiz',
  },
]

export function getComparison(slug: string) {
  return COMPARISONS.find((c) => c.slug === slug)
}

export function comparisonRegisterUrl() {
  return registerUrl()
}

export function comparisonPath(slug: string) {
  return `/vergleich/${slug}`
}
