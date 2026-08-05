export type VerticalFaq = { q: string; a: string }
export type VerticalPain = { icon: string; title: string; text: string }
export type VerticalFeature = { icon: string; title: string; desc: string }
export type VerticalHighlight = {
  visual: string
  title: string
  desc: string
  points: string[]
}
export type VerticalStat = { value: string; label: string }
export type VerticalGuide = {
  title: string
  intro: string
  sections: { heading: string; body: string }[]
}

export type SimyVertical = {
  /** URL path without leading slash, e.g. coaching */
  slug: string
  /** tenant-register ?type= code */
  businessType: string
  /** Nav / hub short label */
  navLabel: string
  /** Badge above H1 */
  badge: string
  /** SEO */
  title: string
  description: string
  keywords: string
  /** Hero */
  h1Line1: string
  h1Highlight: string
  heroSub: string
  ctaPrimary: string
  ctaSecondary: string
  /** Social proof strip */
  stats: VerticalStat[]
  /** Pain section */
  painEyebrow: string
  painTitle: string
  painSub: string
  pains: VerticalPain[]
  painCloser: string
  /** Features */
  featuresEyebrow: string
  featuresTitle: string
  featuresSub: string
  features: VerticalFeature[]
  /** Alternating highlights */
  highlightsTitle: string
  highlightsSub: string
  highlights: VerticalHighlight[]
  /** Optional long-form guide (SEO depth) */
  guide?: VerticalGuide
  /** Proof */
  proofTitle: string
  proofSub: string
  /** FAQ */
  faqs: VerticalFaq[]
  /** Final CTA */
  finalTitle: string
  finalSub: string
  finalNote: string
  /** Schema */
  schemaName: string
  schemaDescription: string
}

export { registerUrl } from './pricing'

export const VERTICALS: SimyVertical[] = [
  {
    slug: 'coaching',
    businessType: 'mental_coach',
    navLabel: 'Coaching',
    badge: 'Für Coaches & Mental-Trainer',
    title: 'Online-Terminbuchung für Coaches – Software Schweiz | Simy',
    description:
      'Online-Terminbuchung und Coaching-Software für die Schweiz: Sitzungskalender, SMS-Erinnerungen, Pakete und QR-Rechnungen. 30 Tage kostenlos testen.',
    keywords:
      'online terminbuchung coach, coaching software schweiz, terminbuchung software, kundenverwaltung coach, online terminplaner coaching',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Coaches',
    heroSub:
      'Terminbuchungssystem, Sitzungskalender, Kundenverwaltung und Schweizer QR-Rechnungen — alles in Simy. Kein Tool-Zoo, kein Excel.',
    ctaPrimary: '30 Tage kostenlos testen',
    ctaSecondary: 'So funktioniert’s',
    stats: [
      { value: '1 App', label: 'statt 5 Tools' },
      { value: '24/7', label: 'Online-Buchung' },
      { value: 'CHF QR', label: 'Schweizer Rechnungen' },
      { value: '5 Min', label: 'Bis zur ersten Buchung' },
    ],
    painEyebrow: 'Das Problem',
    painTitle: 'Wie viel Zeit geht für Admin drauf?',
    painSub:
      'Viele Coaches jonglieren Kalender, WhatsApp, PDF-Rechnungen und Erinnerungen — und verlieren Fokus auf die eigentliche Arbeit.',
    pains: [
      {
        icon: '📱',
        title: 'Termin-Pingpong',
        text: 'Termine per WhatsApp und Mail hin und her — Absagen kommen zu spät, Lücken bleiben leer.',
      },
      {
        icon: '🧾',
        title: 'Rechnungen manuell',
        text: 'Jede Sitzung einzeln abrechnen, PDFs suchen, Zahlungseingänge nachverfolgen.',
      },
      {
        icon: '🔕',
        title: 'No-Shows',
        text: 'Ohne automatische Erinnerungen bleiben Stühle leer — und Umsatz liegt brach.',
      },
    ],
    painCloser: 'Simy automatisiert Buchung, Erinnerung und Rechnung für dich.',
    featuresEyebrow: 'Features',
    featuresTitle: 'Alles, was deine Praxis braucht',
    featuresSub: 'Vom Erstgespräch bis zur bezahlten Sitzung — ein Workflow.',
    features: [
      {
        icon: '📅',
        title: 'Online-Terminbuchung',
        desc: 'Kunden buchen freie Slots selbst — rund um die Uhr, mit deinen Arbeitszeiten und Puffern.',
      },
      {
        icon: '💬',
        title: 'SMS- & E-Mail-Erinnerungen',
        desc: 'Weniger No-Shows: Bestätigungen und Reminder laufen automatisch.',
      },
      {
        icon: '💶',
        title: 'QR-Rechnungen Schweiz',
        desc: 'Rechnungen mit QR-IBAN, korrekt für den Schweizer Zahlungsverkehr.',
      },
      {
        icon: '📦',
        title: 'Sitzungspakete',
        desc: '10er-Pakete und Abos verkaufen — Simy zählt die Einheiten mit.',
      },
      {
        icon: '🧑‍💼',
        title: 'Kundenverwaltung',
        desc: 'Kontakte, Historie und Notizen an einem Ort — DSG-konform.',
      },
      {
        icon: '🎨',
        title: 'Dein Branding',
        desc: 'Farben, Logo und Buchungslink in deinem Look — nicht wie ein Marktplatz.',
      },
    ],
    highlightsTitle: 'Gebaut für Coaching-Alltag',
    highlightsSub: 'Nicht generische Terminsoftware — Workflows, die zu Sitzungen passen.',
    highlights: [
      {
        visual: '🤝',
        title: 'Gratis Erstgespräch + bezahlte Sitzung',
        desc: 'Zwei Terminarten out of the box: Kennenlernen ohne Hürde, danach klare Bezahlung.',
        points: [
          'Öffentlich buchbares Intake',
          'Bezahlte Sitzung mit Preisregel',
          'Arbeitszeiten Mo–Fr vorkonfiguriert',
        ],
      },
      {
        visual: '🧠',
        title: 'Themenbereiche statt Chaos',
        desc: 'Strukturiere Angebote nach Fokus — z. B. Stress, Fokus, Performance.',
        points: [
          'Kategorien als Leistungsbereiche',
          'Klare Buchungsseite für Kunden',
          'Auswertungen nach Themen möglich',
        ],
      },
    ],
    proofTitle: 'Bewährt in der Schweiz',
    proofSub:
      'Dieselbe Plattform, auf der Fahrschulen und Beratungsunternehmen Termine, Rechnungen und Kunden führen — jetzt mit Coaching-Vorlagen.',
    guide: {
      title: 'Online-Terminbuchung für Coaches in der Schweiz — Ratgeber',
      intro:
        'Coaches in der Schweiz brauchen mehr als einen Kalender-Link: Sitzungstypen (Erstgespräch vs. bezahlt), No-Show-Schutz, Pakete und QR-Rechnungen. Simy bündelt das in einer Coaching-Software statt Calendly + Excel + Banking-App.',
      sections: [
        {
          heading: 'Was gute Coaching-Software abdecken muss',
          body: 'Klare Terminarten, automatische Erinnerungen (E-Mail/SMS), Kundenhistorie und Schweizer Zahlungsverkehr. Rein internationale Scheduler stoppen meist bei der Buchung — die Rechnung bleibt Handarbeit.',
        },
        {
          heading: 'Warum «Online-Terminbuchung Coach» oft zu kurz greift',
          body: 'Suchintent meint häufig den ganzen Workflow: Kunde bucht → Reminder → Sitzung → QR-Rechnung oder TWINT. Deshalb lohnt sich All-in-One gegenüber einem reinen Terminplaner.',
        },
        {
          heading: 'Calendly vs. Simy für Coaches',
          body: 'Calendly ist stark für Discovery-Calls. Für Schweizer Coaching-Praxen mit Paketen und Rechnungen ist Simy die passendere Alternative — siehe den direkten Vergleich.',
        },
      ],
    },
    faqs: [
      {
        q: 'Ist Simy für Solo-Coaches geeignet?',
        a: 'Ja. Die meisten starten allein: Kalender, Buchungslink, Rechnungen. Später kannst du weitere Coaches einladen.',
      },
      {
        q: 'Brauche ich eine Kreditkarte für die Testphase?',
        a: 'Nein. 30 Tage testen ohne Kreditkarte — du entscheidest danach.',
      },
      {
        q: 'Sind die Daten in der Schweiz?',
        a: 'Ja. Hosting und Verarbeitung erfolgen DSG-/DSGVO-konform mit Fokus auf Schweizer Anforderungen.',
      },
      {
        q: 'Kann ich bestehende Kunden importieren?',
        a: 'Du legst Kunden manuell an oder übernimmst sie schrittweise beim Onboarding — Support hilft bei der Einrichtung.',
      },
      {
        q: 'Unterstützt Simy Sitzungspakete (z. B. 10er)?',
        a: 'Ja. Du verkaufst Pakete; Simy zählt Einheiten mit — ohne Excel-Nebenrechnung.',
      },
      {
        q: 'Gibt es QR-Rechnungen für Coaching?',
        a: 'Ja. Schweizer QR-IBAN-Rechnungen gehören zum Standard-Workflow, zahlbar per Banking-App.',
      },
      {
        q: 'Ist Simy eine Calendly-Alternative für Coaches?',
        a: 'Ja, wenn du Buchung und Abrechnung zusammen willst. Details: /vergleich/calendly-alternative.',
      },
    ],
    finalTitle: 'Bereit für weniger Admin und mehr Sitzungen?',
    finalSub: '30 Tage kostenlos. Keine Kreditkarte. In Minuten startklar.',
    finalNote: 'Mit Coaching-Vorlage: Intake + Sitzung + Themenbereiche',
    schemaName: 'Simy für Coaching',
    schemaDescription: 'Online-Terminbuchung und Coaching-Software Schweiz: Kundenverwaltung und QR-Rechnungen',
  },
  {
    slug: 'consulting',
    businessType: 'consulting',
    navLabel: 'Consulting',
    badge: 'Für Berater & Consultants',
    title: 'Online-Terminbuchung für Berater – Consulting Software | Simy',
    description:
      'Online-Terminbuchung und Beratung-Software für Consultants in der Schweiz: Erstgespräch, Beratungsslots, Leistungsbereiche und QR-Rechnungen. 30 Tage gratis.',
    keywords:
      'online terminbuchung berater, beratung software, terminbuchungssystem consulting, berater terminplaner, consulting software schweiz',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Berater',
    heroSub:
      'Discovery-Calls, Beratungsslots und QR-Rechnungen in einer App. Für Consultants, die Kunden statt Tools managen wollen.',
    ctaPrimary: 'Kostenlos starten',
    ctaSecondary: 'Features ansehen',
    stats: [
      { value: 'B2B', label: 'Kunden & Firmen' },
      { value: 'QR', label: 'Schweizer Rechnungen' },
      { value: '0%', label: 'Marktplatz-Provision' },
      { value: '30 Tage', label: 'gratis testen' },
    ],
    painEyebrow: 'Realität im Consulting',
    painTitle: 'Kalender voll — Pipeline unklar',
    painSub:
      'Zwischen Calls, Offers und Rechnungen geht Überblick verloren. Simy hält Buchung und Billing zusammen.',
    pains: [
      {
        icon: '📅',
        title: 'Überbuchte Wochen',
        text: 'Discovery und Delivery im selben Kalender ohne klare Slot-Typen.',
      },
      {
        icon: '💼',
        title: 'Rechnungen verzögert',
        text: 'Abrechnung nach dem Call — oft Tage später, Cashflow leidet.',
      },
      {
        icon: '🔀',
        title: 'Zu viele Tools',
        text: 'Calendly + Excel + Word + Banking-App — Kontext geht verloren.',
      },
    ],
    painCloser: 'Ein System für Termin, Kunde und Rechnung.',
    featuresEyebrow: 'Für Consultants',
    featuresTitle: 'Vom Discovery bis zur Zahlung',
    featuresSub: 'Vorlagen für IT-, Strategie- und Projektberatung.',
    features: [
      {
        icon: '🤝',
        title: 'Erstgespräch gratis',
        desc: 'Öffentlich buchbares Discovery — ohne Zahlungshürde.',
      },
      {
        icon: '💼',
        title: 'Beratungsslots',
        desc: 'Bezahlte 60-Minuten-Beratung mit klarer Preisregel.',
      },
      {
        icon: '🗂️',
        title: 'Leistungsbereiche',
        desc: 'Cloud, Security, DevOps, Strategie — strukturierte Angebote.',
      },
      {
        icon: '🏢',
        title: 'Firmenkunden',
        desc: 'Rechnungen an Unternehmen mit Kontaktperson und Adresse.',
      },
      {
        icon: '💶',
        title: 'QR-Rechnung',
        desc: 'Schweizer Standard — zahlbar per Banking-App.',
      },
      {
        icon: '📝',
        title: 'Session-Notizen',
        desc: 'Dokumentation nach dem Call, damit Follow-ups nicht versanden.',
      },
    ],
    highlightsTitle: 'Consulting ohne Tool-Zoo',
    highlightsSub: 'Eine Buchungsseite, ein Kundenstamm, ein Rechnungsfluss.',
    highlights: [
      {
        visual: '🚀',
        title: 'Schneller Onboarding-Pfad',
        desc: 'Branche «Consulting» wählen — Vorlagen für Terminarten und Preise sind da.',
        points: ['Discovery + Beratung', 'Vier Leistungsbereiche', 'Mo–Fr Bürozeiten'],
      },
      {
        visual: '🇨🇭',
        title: 'Schweiz-first Billing',
        desc: 'QR-IBAN und korrekte Rechnungsadresse — ready for Treuhänder.',
        points: ['Zahlungsfrist konfigurierbar', 'Offene Posten im Blick', 'Kein Marktplatz'],
      },
    ],
    proofTitle: 'Gebaut für Schweizer KMUs',
    proofSub: 'Simy läuft produktiv bei Dienstleistern mit Staff, Kunden und Rechnungen.',
    guide: {
      title: 'Online-Terminbuchung für Berater — was zählt in der Schweiz',
      intro:
        'Consultants verlieren Zeit zwischen Calendly, Word-Angeboten und Banking-App. Online-Terminbuchung für Berater bedeutet in der Praxis: Discovery, bezahlte Slots, Leistungsbereiche und QR-Rechnung ohne Medienbruch.',
      sections: [
        {
          heading: 'Discovery und bezahlte Beratung trennen',
          body: 'Zwei Terminarten out of the box senken die Hürde für Erstgespräche und halten den Cashflow bei Folge-Slots klar.',
        },
        {
          heading: 'Schweiz-first Billing',
          body: 'QR-IBAN und korrekte Rechnungsadressen sind Pflicht gegenüber Treuhändern und Firmenkunden — kein US-Scheduler-Export-Chaos.',
        },
        {
          heading: 'Wann Suite, wann Simy?',
          body: 'Brauchst du volle Finanzbuchhaltung in einer Suite, prüfe KLARA. Primär Terminbetrieb und Kundenabrechnung? Dann ist Simy der direktere Fit — siehe /vergleich/klara.',
        },
      ],
    },
    faqs: [
      {
        q: 'Eignet sich Simy für Freelance-Consultants?',
        a: 'Ja — Solo-Setup ist der Standard. Du kannst später Teammitglieder einladen.',
      },
      {
        q: 'Kann ich Firmenkunden verrechnen?',
        a: 'Ja. Firmenkunden mit Rechnungsadresse und Kontaktperson sind vorgesehen.',
      },
      {
        q: 'Gibt es eine Provision auf Buchungen?',
        a: 'Nein. Deine Buchungsseite gehört dir — keine Marktplatzgebühr.',
      },
      {
        q: 'Ersetzt Simy meine Buchhaltungssoftware?',
        a: 'Nein. Simy deckt Kundenabrechnung und Export ab; die Finanzbuchhaltung bleibt beim Treuhänder oder einer Suite.',
      },
      {
        q: 'Kann ich Leistungsbereiche (z. B. IT vs. Strategie) abbilden?',
        a: 'Ja. Kategorien strukturieren Angebote und die Buchungsseite für Kunden.',
      },
      {
        q: 'Ist Simy eine Calendly-Alternative für Berater?',
        a: 'Ja, wenn du Termin und QR-Rechnung zusammen willst. Vergleich: /vergleich/calendly-alternative.',
      },
    ],
    finalTitle: 'Mehr billable Hours, weniger Admin',
    finalSub: '30 Tage testen. Consulting-Vorlage inklusive.',
    finalNote: 'Consulting-Vorlage: Discovery + Beratung + Leistungsbereiche',
    schemaName: 'Simy für Consulting',
    schemaDescription: 'Online-Terminbuchung und Beratung-Software Schweiz: Termine, Kunden und QR-Rechnungen',
  },
  {
    slug: 'personal-training',
    businessType: 'fitness',
    navLabel: 'Personal Training',
    badge: 'Für Personal Trainer & Boutique-Studios',
    title: 'Online-Terminbuchung für Personal Trainer – Software CH | Simy',
    description:
      'Online-Terminbuchung und Studio-Software für Personal Trainer: Probe-Training, Pakete, SMS-Erinnerungen und QR-Rechnungen. 30 Tage kostenlos.',
    keywords:
      'online terminbuchung personal trainer, studio software, trainer software, buchungssystem fitness, personal training software schweiz',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Personal Trainer',
    heroSub:
      'Probe-Training, 1:1-Slots, Pakete und Schweizer Rechnungen — Buchungssystem und Studio-Software in einer App.',
    ctaPrimary: '30 Tage gratis testen',
    ctaSecondary: 'Features entdecken',
    stats: [
      { value: '06:30', label: 'Früh-Slots möglich' },
      { value: 'Pakete', label: '10er & Abos' },
      { value: 'SMS', label: 'weniger No-Shows' },
      { value: 'QR', label: 'sofort zahlbar' },
    ],
    painEyebrow: 'Trainer-Alltag',
    painTitle: 'WhatsApp ist kein Buchungssystem',
    painSub: 'Wenn der Kalender im Chat lebt, verlierst du Slots, Zahlungen und Überblick.',
    pains: [
      {
        icon: '⏰',
        title: 'Leere Morgen-Slots',
        text: 'Absagen ohne System — der nächste Kunde erfährt es zu spät.',
      },
      {
        icon: '💳',
        title: 'Offene 10er-Karten',
        text: 'Wer hat noch wie viele Einheiten? Excel lügt oft.',
      },
      {
        icon: '📉',
        title: 'No-Shows',
        text: 'Ohne Reminder bleibt die Matte leer — du hast den Slot blockiert.',
      },
    ],
    painCloser: 'Simy hält Kalender, Pakete und Zahlung zusammen.',
    featuresEyebrow: 'Für Trainer',
    featuresTitle: 'Vom Probe-Training zur Stammkundschaft',
    featuresSub: 'Vorlage Personal Training mit sinnvollen Defaults.',
    features: [
      {
        icon: '🤝',
        title: 'Probe-Training',
        desc: 'Kostenloses Kennenlernen — öffentlich buchbar.',
      },
      {
        icon: '💪',
        title: '60′-Training',
        desc: 'Bezahlte Einheit mit Default-Preis CHF 120 (anpassbar).',
      },
      {
        icon: '📦',
        title: 'Trainingspakete',
        desc: 'Mehrere Einheiten verkaufen und abbuchen.',
      },
      {
        icon: '📱',
        title: 'Erinnerungen',
        desc: 'SMS/E-Mail vor dem Termin — weniger No-Shows.',
      },
      {
        icon: '🏷️',
        title: 'Trainingsbereiche',
        desc: 'Kraft, Ausdauer, Mobility, Abnehmen — klar strukturiert.',
      },
      {
        icon: '💶',
        title: 'QR-Rechnung',
        desc: 'Schweizer Standard für Studios und Solo-PTs.',
      },
    ],
    highlightsTitle: 'Studio-ready, Solo-friendly',
    highlightsSub: 'Frühe und späte Slots, Samstagvormittag — wie im echten PT-Alltag.',
    highlights: [
      {
        visual: '🏋️',
        title: 'Arbeitszeiten für Trainer',
        desc: 'Defaults von 06:30–21:00, Samstag kürzer — sofort nutzbar.',
        points: ['Anpassbar pro Trainer', 'Online-Buchung respektiert Pausen', 'Mehrere Standorte möglich'],
      },
      {
        visual: '🎯',
        title: 'Kein Fitness-Marktplatz',
        desc: 'Deine Kunden, dein Link, deine Marke — ohne Provision an Plattformen.',
        points: ['Eigene Buchungsseite', 'Branding mit Logo/Farben', 'Direkte Kundenbeziehung'],
      },
    ],
    proofTitle: 'Dieselbe Engine wie bei Fahrschulen',
    proofSub: 'Termin, Kunde, Zahlung — in der Schweiz schon produktiv im Einsatz.',
    faqs: [
      {
        q: 'Kann ich 10er-Pakete verkaufen?',
        a: 'Ja. Packages sind für Personal Training vorgesehen — ideal für Mehrfach-Einheiten.',
      },
      {
        q: 'Geht Simy auch für Boutique-Studios mit mehreren Trainern?',
        a: 'Ja. Du lädst Trainer ein und verwaltest Kalender zentral.',
      },
      {
        q: 'Brauche ich eine Mitgliedschafts-App?',
        a: 'Für 1:1-PT und kleine Studios reicht Simy. Gross-Gyms mit Zutrittskontrolle sind nicht der Fokus.',
      },
    ],
    finalTitle: 'Fülle deine Slots — nicht dein Chat',
    finalSub: 'Personal-Training-Vorlage inklusive. 30 Tage gratis.',
    finalNote: 'PT-Vorlage: Probetraining, Pakete und Session-Typen',
    schemaName: 'Simy für Personal Training',
    schemaDescription: 'Online-Terminbuchung und Studio-Software für Personal Trainer Schweiz',
  },
  {
    slug: 'nachhilfe',
    businessType: 'tutoring',
    navLabel: 'Nachhilfe',
    badge: 'Für Nachhilfe & Tutoren',
    title: 'Online-Terminbuchung für Nachhilfe – Software Schweiz | Simy',
    description:
      'Online-Terminbuchung und Nachhilfe-Software: Probestunde, Fächer, Lektionen planen und QR-Rechnungen an Eltern. Für Tutoren und Nachhilfeschulen. 30 Tage gratis.',
    keywords:
      'online terminbuchung nachhilfe, nachhilfe software schweiz, kursverwaltung software, tutor terminplaner, lektionen buchen',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Nachhilfe',
    heroSub:
      'Probestunde, Fächer, wiederkehrende Lektionen und Rechnungen an Eltern — Terminbuchung ohne Excel und Chat-Chaos.',
    ctaPrimary: 'Kostenlos testen',
    ctaSecondary: 'So sieht’s aus',
    stats: [
      { value: '45′', label: 'Standard-Lektion' },
      { value: 'Fächer', label: 'klar strukturiert' },
      { value: 'Eltern', label: 'einfach verrechnen' },
      { value: 'SMS', label: 'Termin-Reminder' },
    ],
    painEyebrow: 'Typischer Tutor-Alltag',
    painTitle: 'Zwischen Matura-Stress und Terminchaos',
    painSub: 'Schüler wollen Flexibilität — du brauchst Verlässlichkeit und Zahlung.',
    pains: [
      {
        icon: '📚',
        title: 'Fach-Mix ohne System',
        text: 'Mathe, Deutsch, Englisch im selben Chat — niemand weiss, was gebucht ist.',
      },
      {
        icon: '👨‍👩‍👧',
        title: 'Eltern-Kommunikation',
        text: 'Absagen, Umbuchungen und Rechnungen landen in drei Kanälen.',
      },
      {
        icon: '🧾',
        title: 'Monatsende-Stress',
        text: 'Stunden zusammenzählen und manuell fakturieren.',
      },
    ],
    painCloser: 'Simy macht aus Lektionen einen klaren Ablauf.',
    featuresEyebrow: 'Für Nachhilfe',
    featuresTitle: 'Unterricht organisieren, nicht improvisieren',
    featuresSub: 'Vorlage mit Probestunde und Nachhilfe-Lektion.',
    features: [
      {
        icon: '🤝',
        title: 'Probestunde',
        desc: 'Kostenloses Kennenlernen — Hürde für Neukunden senken.',
      },
      {
        icon: '📖',
        title: 'Nachhilfe 45′',
        desc: 'Default-Preis ca. CHF 60 — jederzeit anpassbar.',
      },
      {
        icon: '🧮',
        title: 'Fächer',
        desc: 'Mathematik, Deutsch, Englisch, Französisch vorbereitet.',
      },
      {
        icon: '🕒',
        title: 'Nachmittags-Slots',
        desc: 'Defaults 14–20 Uhr, Samstag vormittags.',
      },
      {
        icon: '💶',
        title: 'Rechnungen an Eltern',
        desc: 'QR-Rechnung Schweiz — klar und nachvollziehbar.',
      },
      {
        icon: '🔔',
        title: 'Erinnerungen',
        desc: 'Weniger verpasste Lektionen dank Reminder.',
      },
    ],
    highlightsTitle: 'Gebaut wie Unterricht',
    highlightsSub: 'Schüler, Tutor, Lektion — Terminologie stimmt von Anfang an.',
    highlights: [
      {
        visual: '🎓',
        title: 'Schul-ähnlicher Flow',
        desc: 'Dieselbe DNA wie Fahrschul-Lektionen: wiederkehrend, personalisiert, verrechenbar.',
        points: ['Öffentliche Buchung', 'Staff-Kalender für Tutoren', 'Pakete für 10er-Blöcke'],
      },
      {
        visual: '🇨🇭',
        title: 'Schweizer Eltern erwarten Klarheit',
        desc: 'Professionelle Rechnung statt Twint-Pingpong ohne Beleg.',
        points: ['QR-IBAN', 'Offene Posten', 'Kein Marktplatz'],
      },
    ],
    proofTitle: 'Von Ausbildern für Ausbilder',
    proofSub: 'Simy kommt aus dem Fahrschul-Alltag — Unterrichtsorganisation steckt in der DNA.',
    faqs: [
      {
        q: 'Können mehrere Tutoren in einer Schule arbeiten?',
        a: 'Ja. Du lädst Lehrpersonen ein und verteilst Lektionen im Team-Kalender.',
      },
      {
        q: 'Geht Online-Nachhilfe (Zoom)?',
        a: 'Ja. Du kannst Online-Standorte/Kanäle nutzen und den Link in der Bestätigung mitgeben.',
      },
      {
        q: 'Was kostet Simy?',
        a: 'Pläne ab günstigen Monatsbeiträgen — 30 Tage gratis testen ohne Kreditkarte.',
      },
    ],
    finalTitle: 'Mehr Lektionen, weniger Organisation',
    finalSub: 'Nachhilfe-Vorlage starten. 30 Tage kostenlos.',
    finalNote: 'Nachhilfe-Vorlage: Probestunde, Fächer und Eltern-Rechnung',
    schemaName: 'Simy für Nachhilfe',
    schemaDescription: 'Online-Terminbuchung und Nachhilfe-Software Schweiz: Lektionen und QR-Rechnungen',
  },
  {
    slug: 'musikschule',
    businessType: 'music_school',
    navLabel: 'Musikschule',
    badge: 'Für Musikschulen & Instrumentallehrer',
    title: 'Online-Terminbuchung Musikschule – Software Schweiz | Simy',
    description:
      'Online-Terminbuchung und Musikschul-Software: Probestunde, Instrumente, Lehrer-Kalender und QR-Rechnungen. Für private Musikschulen und Instrumentallehrer.',
    keywords:
      'online terminbuchung musikschule, musikschule software schweiz, kursverwaltung software, musiklehrer terminplaner, instrumentalunterricht buchung',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Musikschulen',
    heroSub:
      'Probestunden, Instrumente, Lehrerpläne und Rechnungen — Terminplaner und Kursverwaltung in einem System.',
    ctaPrimary: 'Jetzt testen',
    ctaSecondary: 'Features',
    stats: [
      { value: '45′', label: 'Standardstunde' },
      { value: 'Instrumente', label: 'als Kategorien' },
      { value: 'Lehrer', label: 'eigene Kalender' },
      { value: 'Pakete', label: 'Semester & 10er' },
    ],
    painEyebrow: 'Musikschul-Alltag',
    painTitle: 'Der Stundenplan darf nicht improvisiert sein',
    painSub: 'Zwischen Zimmern, Lehrpersonen und Eltern braucht es System — nicht einen Gruppenchat.',
    pains: [
      {
        icon: '🎹',
        title: 'Instrumente vermischt',
        text: 'Klavier und Gitarre im selben Chaos — Schüler buchen das Falsche.',
      },
      {
        icon: '👩‍🏫',
        title: 'Lehrer-Überschneidungen',
        text: 'Zwei Stunden zur gleichen Zeit, ein Raum — Klassiker ohne Software.',
      },
      {
        icon: '💶',
        title: 'Semester-Abrechnung',
        text: 'Manuelles Zusammensuchen von Stunden für Elternrechnungen.',
      },
    ],
    painCloser: 'Simy orchestriert Buchung und Billing.',
    featuresEyebrow: 'Für Musikschulen',
    featuresTitle: 'Unterricht im Takt',
    featuresSub: 'Vorlage mit Probestunde und Musikstunde.',
    features: [
      {
        icon: '🤝',
        title: 'Probestunde',
        desc: 'Kostenloses Kennenlernen für neue Schüler.',
      },
      {
        icon: '🎹',
        title: 'Musikstunde 45′',
        desc: 'Default ca. CHF 70 — frei anpassbar.',
      },
      {
        icon: '🎸',
        title: 'Instrumente',
        desc: 'Klavier, Gitarre, Gesang, Schlagzeug vorbereitet.',
      },
      {
        icon: '📅',
        title: 'Lehrer-Kalender',
        desc: 'Mehrere Lehrpersonen ohne Doppelbuchung.',
      },
      {
        icon: '📦',
        title: 'Pakete',
        desc: '10er oder Semesterblöcke verkaufen.',
      },
      {
        icon: '🧾',
        title: 'QR-Rechnung',
        desc: 'Professionell an Eltern und Erwachsene.',
      },
    ],
    highlightsTitle: 'Privatschule oder Solo-Lehrer',
    highlightsSub: 'Skalierbar vom Einzelunterricht bis zum kleinen Team.',
    highlights: [
      {
        visual: '🎼',
        title: 'Nachmittags- und Abendunterricht',
        desc: 'Defaults 13–20 Uhr unter der Woche, Samstag vormittags.',
        points: ['Arbeitszeiten pro Lehrperson', 'Online-Buchung', 'Erinnerungen'],
      },
      {
        visual: '🏫',
        title: 'Deine Marke, nicht ein Marktplatz',
        desc: 'Schüler buchen bei dir — nicht neben der Konkurrenz.',
        points: ['Eigener Link', 'Logo & Farben', 'Keine Provision'],
      },
    ],
    proofTitle: 'Unterrichts-DNA aus der Praxis',
    proofSub: 'Simy kommt aus wiederkehrendem Unterricht — perfekt für Instrumentalstunden.',
    faqs: [
      {
        q: 'Können Raumbelegungen abgebildet werden?',
        a: 'Standorte und Ressourcen lassen sich nutzen; für komplexe Raumpläne erweitern wir je nach Bedarf.',
      },
      {
        q: 'Ist Simy für Einzel-Musiklehrer sinnvoll?',
        a: 'Ja — Solo-Lehrer starten in Minuten mit Probestunde und Musikstunde.',
      },
      {
        q: 'Gibt es eine App für Lehrpersonen?',
        a: 'Kalender und Schüler sind mobil im Browser nutzbar — praxisnah im Unterrichtsalltag.',
      },
    ],
    finalTitle: 'Spielbereit in Minuten',
    finalSub: 'Musikschul-Vorlage. 30 Tage kostenlos testen.',
    finalNote: 'Musikschul-Vorlage: Probestunde, Instrumente und Lehrerpläne',
    schemaName: 'Simy für Musikschulen',
    schemaDescription: 'Online-Terminbuchung und Musikschul-Software Schweiz für Unterricht und Rechnungen',
  },
  {
    slug: 'hundeschule',
    businessType: 'dog_training',
    navLabel: 'Hundeschule',
    badge: 'Für Hundeschulen & Hundetrainer',
    title: 'Online-Terminbuchung Hundeschule – Software Schweiz | Simy',
    description:
      'Online-Terminbuchung und Hundeschul-Software: Erstberatung, Einzeltraining, Welpenkurse und QR-Rechnungen. Buchungssystem für Hundetrainer. 30 Tage gratis.',
    keywords:
      'online terminbuchung hundeschule, hundeschule software schweiz, buchungssystem hundetrainer, kursverwaltung welpenkurs, hundetraining terminplaner',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Hundeschulen',
    heroSub:
      'Einzeltraining, Welpenkurse und Halter-Kommunikation: Buchungssystem plus Schweizer QR-Rechnungen.',
    ctaPrimary: 'Gratis testen',
    ctaSecondary: 'Mehr erfahren',
    stats: [
      { value: '1:1', label: 'Einzeltraining' },
      { value: 'Kurse', label: 'Welpen & Gruppen' },
      { value: 'Halter', label: 'klare Kommunikation' },
      { value: 'QR', label: 'Bezahlung CH' },
    ],
    painEyebrow: 'Trainer-Realität',
    painTitle: 'Hunde sind planbar — der Admin oft nicht',
    painSub: 'Zwischen Platz, Wetter und Absagen brauchst du ein System, das Halter mitzieht.',
    pains: [
      {
        icon: '🐕',
        title: 'Chat statt Kalender',
        text: 'Trainingstermine per WhatsApp — Übersicht über Hunde und Halter fehlt.',
      },
      {
        icon: '🌦️',
        title: 'Absagen & Umbuchen',
        text: 'Wetterbedingt verschieben ohne automatische Info an die Gruppe.',
      },
      {
        icon: '💳',
        title: 'Kursgebühren',
        text: 'Wer hat den Welpenkurs bezahlt? Manuelles Nachhaken kostet Zeit.',
      },
    ],
    painCloser: 'Simy bringt Training, Kurs und Zahlung zusammen.',
    featuresEyebrow: 'Für Hundeschulen',
    featuresTitle: 'Einzel + Kurs — eine Plattform',
    featuresSub: 'Vorlage mit Erstberatung und Einzeltraining; Kurse über das Kursmodul.',
    features: [
      {
        icon: '🤝',
        title: 'Erstberatung',
        desc: 'Kostenloses Kennenlernen für Hundehalter.',
      },
      {
        icon: '🦮',
        title: 'Einzeltraining 60′',
        desc: 'Default ca. CHF 90 — anpassbar.',
      },
      {
        icon: '🐾',
        title: 'Trainingsbereiche',
        desc: 'Welpen, Grundgehorsam, Alltag, Sport.',
      },
      {
        icon: '🎓',
        title: 'Kurse',
        desc: 'Gruppenformate über das Kurs-Feature (Plan abhängig).',
      },
      {
        icon: '🔔',
        title: 'Erinnerungen',
        desc: 'SMS/Mail an Halter vor dem Termin.',
      },
      {
        icon: '💶',
        title: 'QR-Rechnung',
        desc: 'Kurs und Training sauber verrechnen.',
      },
    ],
    highlightsTitle: 'Pet-Business, Profi-Tools',
    highlightsSub: 'Dieselbe Kurs-DNA wie bei Fahrschulen — ideal für Welpenkurse.',
    highlights: [
      {
        visual: '🏕️',
        title: 'Platz & Outdoor-Alltag',
        desc: 'Arbeitszeiten inkl. Samstag — typisch für Hundeschulen.',
        points: ['Staff-Kalender', 'Öffentliche Buchung', 'Standorte'],
      },
      {
        visual: '📋',
        title: 'Halter im Fokus',
        desc: 'Terminologie «Hundehalter» / «Hundetrainer» von Tag eins.',
        points: ['Klare Labels', 'Historie pro Kunde', 'Keine Marktplatz-Provision'],
      },
    ],
    proofTitle: 'Kurskompetenz inklusive',
    proofSub: 'Simy kennt Gruppenkurse aus dem Fahrschul-Geschäft — übertragbar auf Welpenkurse.',
    faqs: [
      {
        q: 'Kann ich Welpenkurse mit Teilnehmerlimit anbieten?',
        a: 'Ja, über das Kursmodul mit Plätzen und Anmeldungen (je nach Plan).',
      },
      {
        q: 'Funktioniert Simy für Solo-Hundetrainer?',
        a: 'Ja. Starte mit Erstberatung und Einzeltraining — Kurse später ergänzen.',
      },
      {
        q: 'Sind Daten DSG-konform?',
        a: 'Ja. Schweizer Fokus und DSGVO-Anforderungen sind Teil des Produkts.',
      },
    ],
    finalTitle: 'Mehr Training, weniger Organisation',
    finalSub: 'Hundeschul-Vorlage. 30 Tage kostenlos.',
    finalNote: 'Hundeschul-Vorlage: Einzeltraining, Welpenkurse und Halter-Kommunikation',
    schemaName: 'Simy für Hundeschulen',
    schemaDescription: 'Online-Terminbuchung und Hundeschul-Software Schweiz für Training, Kurse und Rechnungen',
  },
  {
    slug: 'massage',
    businessType: 'massage',
    navLabel: 'Massage',
    badge: 'Für Massage & Wellness (Selbstzahler)',
    title: 'Online-Terminbuchung Massage – Praxis-Software Schweiz | Simy',
    description:
      'Online-Terminbuchung und Praxis-Software für Massage: Behandlungen buchen, Reminder, QR-Rechnungen. Für Selbstzahler-Praxen ohne Marktplatzgebühr. 30 Tage gratis.',
    keywords:
      'online terminbuchung massage, praxis software massage, praxissoftware wellness, terminbuchung massagepraxis, massage software schweiz',
    h1Line1: 'Online-Terminbuchung für',
    h1Highlight: 'Massagepraxen',
    heroSub:
      'Kunden reservieren Behandlungen online, Reminder laufen automatisch, QR-Rechnungen sind ready — Praxis-Software ohne Salon-Marktplatz.',
    ctaPrimary: '30 Tage gratis',
    ctaSecondary: 'Funktionen',
    stats: [
      { value: '60′', label: 'Standardbehandlung' },
      { value: '24/7', label: 'Online-Buchung' },
      { value: 'SMS', label: 'weniger No-Shows' },
      { value: '0%', label: 'Marktplatzgebühr' },
    ],
    painEyebrow: 'Praxis-Alltag',
    painTitle: 'Zwischen Behandlung und Telefon',
    painSub: 'Jede manuelle Terminabsprache kostet Behandlungszeit — und Nerven.',
    pains: [
      {
        icon: '☎️',
        title: 'Telefon-Unterbruch',
        text: 'Während der Massage klingelt das Handy wegen Terminfragen.',
      },
      {
        icon: '🕳️',
        title: 'Löcher im Tag',
        text: 'Absagen ohne Warteliste — Umsatz weg.',
      },
      {
        icon: '🧾',
        title: 'Belege nachziehen',
        text: 'Quittungen und Rechnungen am Abend statt Feierabend.',
      },
    ],
    painCloser: 'Simy nimmt dir die Front-Desk-Arbeit ab.',
    featuresEyebrow: 'Für Massagepraxen',
    featuresTitle: 'Buchung, Behandlung, Zahlung',
    featuresSub: 'Selbstzahler-fokussiert — ohne KK-Tarifmodul.',
    features: [
      {
        icon: '🤝',
        title: 'Ersttermin',
        desc: 'Kurzes Kennenlernen / Anamnese kostenlos buchbar.',
      },
      {
        icon: '🌿',
        title: 'Behandlung 60′',
        desc: 'Default ca. CHF 130 — pro Praxis anpassbar.',
      },
      {
        icon: '🕯️',
        title: 'Behandlungsarten',
        desc: 'Klassisch, Sport, Shiatsu, Hot Stone.',
      },
      {
        icon: '🔔',
        title: 'Automatische Reminder',
        desc: 'SMS und E-Mail gegen No-Shows.',
      },
      {
        icon: '💶',
        title: 'QR-Rechnung',
        desc: 'Schweizer Zahlung ohne Umwege.',
      },
      {
        icon: '🎨',
        title: 'Eigenes Branding',
        desc: 'Buchungsseite in deinem Look — kein Treatwell-Feeling.',
      },
    ],
    highlightsTitle: 'Leicht statt überladen',
    highlightsSub: 'Kein schweres Kassensystem — Fokus auf Termine und Kunden.',
    highlights: [
      {
        visual: '🧘',
        title: 'Selbstzahler klar positioniert',
        desc: 'Ideal für Wellness und Massage ohne Krankenkassen-Abrechnung.',
        points: ['Schneller Start', 'Klare Preise', 'Pakete möglich'],
      },
      {
        visual: '🇨🇭',
        title: 'Schweizer Erwartung',
        desc: 'Pünktliche Reminder und saubere Belege gehören zum Service.',
        points: ['DSG-konform', 'QR-IBAN', 'Support auf Deutsch'],
      },
    ],
    proofTitle: 'Terminsoftware mit Billing',
    proofSub: 'Viele Massage-Tools stoppen bei Buchung — Simy liefert die Rechnung gleich mit.',
    guide: {
      title: 'Online-Terminbuchung für Massagepraxen — ohne Marktplatzgebühr',
      intro:
        'Massage-Kundinnen erwarten Online-Buchung und Reminder. Viele Tools sind Marktplätze mit Provision. Simy ist Praxis-Software: Buchung, SMS/E-Mail-Erinnerungen und QR-Rechnung — deine Kunden bleiben deine Kunden.',
      sections: [
        {
          heading: 'Selbstzahler klar positionieren',
          body: 'Simy fokussiert Wellness und Massage ohne Krankenkassen-Tarifwesen — dafür bleibt der Start schnell und die Preise klar.',
        },
        {
          heading: 'Treatwell & Co. vs. eigene Buchungsseite',
          body: 'Marktplätze bringen Sichtbarkeit, kosten aber Provision und Branding. Mit Simy steuerst du die Buchungsseite in deinem Look — ohne Kommission pro Termin.',
        },
        {
          heading: 'SimplyBook oder Simy?',
          body: 'Internationale Modul-Plattformen können viel. Für Schweiz-first Billing und schlanke Ops ist Simy oft die klarere Alternative — siehe /vergleich/simplybook.',
        },
      ],
    },
    faqs: [
      {
        q: 'Unterstützt Simy Krankenkassen-Tarife?',
        a: 'Aktuell Fokus auf Selbstzahler. KK-/Tarifwesen ist bewusst nicht der Einstieg — dafür bleibt das Produkt schlank.',
      },
      {
        q: 'Kann ich mehrere Behandlungsräume abbilden?',
        a: 'Standorte und Ressourcen helfen bei der Planung; für komplexe Raumlogik beraten wir dich im Onboarding.',
      },
      {
        q: 'Gibt es eine Provision?',
        a: 'Nein. Deine Buchungen gehören dir — keine Marktplatzgebühr.',
      },
      {
        q: 'Reduziert Simy No-Shows?',
        a: 'Ja — automatische Bestätigungen und Reminder per E-Mail/SMS senken vergessene Termine spürbar.',
      },
      {
        q: 'Kann ich Behandlungsarten mit unterschiedlichen Preisen anbieten?',
        a: 'Ja. Mehrere Terminarten mit Dauer und Preis — Kunden wählen auf der Buchungsseite.',
      },
      {
        q: 'Ist Simy eine Treatwell-Alternative ohne Kommission?',
        a: 'Für bestehende Kunden und Eigenmarketing ja: Buchung + Rechnung ohne Marktplatzgebühr. Neukunden-Marketplace ersetzt Simy nicht.',
      },
    ],
    finalTitle: 'Mehr Behandlungen, weniger Telefon',
    finalSub: 'Massage-Vorlage inklusive. 30 Tage kostenlos.',
    finalNote: 'Massage-Vorlage: Behandlungen, Reminder und QR-Rechnung',
    schemaName: 'Simy für Massagepraxen',
    schemaDescription: 'Online-Terminbuchung und Praxis-Software für Massage Schweiz: Reminder und QR-Rechnungen',
  },
]

export function getVertical(slug: string) {
  return VERTICALS.find((v) => v.slug === slug)
}
