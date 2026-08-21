import { ADDON_GBP_CHF } from './pricing'

export const GBP_PATH = '/features/google-business-profile'
export const GBP_PRICE_CHF = ADDON_GBP_CHF

export type GbpIndustry = {
  slug: string
  businessType: string
  label: string
  search: string
  lost: string
  keywords: string
}

export const GBP_INDUSTRIES: GbpIndustry[] = [
  {
    slug: 'fahrschule',
    businessType: 'driving_school',
    label: 'Fahrschulen',
    search: 'Fahrschule in der Nähe',
    lost: 'Probestunden und Fahrstunden-Anfragen',
    keywords: 'google business profile fahrschule, google maps fahrschule, fahrschule in der nähe, google unternehmen fahrschule',
  },
  {
    slug: 'coaching',
    businessType: 'mental_coach',
    label: 'Coaches',
    search: 'Coach in der Nähe',
    lost: 'Erstgespräche und Coaching-Anfragen',
    keywords: 'google business profile coaching, google maps coach, coaching praxis google unternehmen',
  },
  {
    slug: 'consulting',
    businessType: 'consulting',
    label: 'Berater',
    search: 'Beratung in der Nähe',
    lost: 'Erstberatungen und Mandatsanfragen',
    keywords: 'google business profile beratung, google maps consultant, beratung software google maps',
  },
  {
    slug: 'personal-training',
    businessType: 'fitness',
    label: 'Personal Trainer',
    search: 'Personal Trainer in der Nähe',
    lost: 'Probetrainings und Studio-Anfragen',
    keywords: 'google business profile personal trainer, google maps fitness studio, personal training google unternehmen',
  },
  {
    slug: 'nachhilfe',
    businessType: 'tutoring',
    label: 'Nachhilfe',
    search: 'Nachhilfe in der Nähe',
    lost: 'Schnupperlektionen und Fachanfragen',
    keywords: 'google business profile nachhilfe, google maps nachhilfe, nachhilfelehrer google unternehmen',
  },
  {
    slug: 'musikschule',
    businessType: 'music_school',
    label: 'Musikschulen',
    search: 'Musikschule in der Nähe',
    lost: 'Schnupperstunden und Instrument-Anfragen',
    keywords: 'google business profile musikschule, google maps musikunterricht, musikschule google unternehmen',
  },
  {
    slug: 'hundeschule',
    businessType: 'dog_training',
    label: 'Hundeschulen',
    search: 'Hundeschule in der Nähe',
    lost: 'Welpenkurse und Trainings-Anfragen',
    keywords: 'google business profile hundeschule, google maps hundetrainer, hundeschule google unternehmen',
  },
  {
    slug: 'massage',
    businessType: 'massage',
    label: 'Massage-Praxen',
    search: 'Massage in der Nähe',
    lost: 'Ersttermine und Behandlungs-Anfragen',
    keywords: 'google business profile massage, google maps massagepraxis, wellness praxis google unternehmen',
  },
]

export function gbpIndustry(businessType?: string | null, slug?: string | null): GbpIndustry {
  if (slug) {
    const bySlug = GBP_INDUSTRIES.find((i) => i.slug === slug)
    if (bySlug) return bySlug
  }
  const t = String(businessType || '')
  return GBP_INDUSTRIES.find((i) => i.businessType === t) || GBP_INDUSTRIES[0]
}

export function gbpHighlightCopy(industry: GbpIndustry) {
  return {
    eyebrow: 'Google Business Profile',
    title: `Niemand nutzt das Potenzial seines Google-Unternehmensprofils`,
    subtitle: `Wer «${industry.search}» googelt, klickt zuerst auf Maps. Ohne Posts, aktuelle Infos und Bewertungen gehen kostenlose Klicks verloren — und damit oft mehrere Tausend Franken Umsatz pro Monat.`,
    cta: `GBP automatisieren — CHF ${GBP_PRICE_CHF}/Mt.`,
    bullet: `Simy postet den Jahreskalender, verteilt deine Fotos und beantwortet neue Reviews automatisch — für ${industry.label}, ohne extra Google-Login.`,
  }
}

/** What the add-on actually does — keep marketing in sync with the product. */
export const GBP_AUTOMATIONS = [
  {
    icon: 'calendar',
    title: 'Jahreskalender postet von selbst',
    auto: true,
    desc: 'Simy AI plant 12 Monate Themen. Du stellst 1–4 Posts pro Woche ein — der Rest geht automatisch live, inkl. Buchungs-CTA.',
  },
  {
    icon: 'palette',
    title: 'Foto-Pool auf Google',
    auto: true,
    desc: 'Du lädst Fotos einmal hoch und gibst sie frei. Simy schreibt Bildtexte und veröffentlicht 1–3 Fotos pro Woche — gleichmässig verteilt.',
  },
  {
    icon: 'award',
    title: 'Reviews werden automatisch beantwortet',
    auto: true,
    desc: 'Neue Google-Reviews beantwortet die KI von selbst (Bürozeiten 7–19 Uhr). Du siehst die Antworten in Simy — bei Bedarf stellst du auf Freigabe um.',
  },
  {
    icon: 'building',
    title: 'Mehrere Standorte, ein Konto',
    auto: true,
    desc: 'Ein Google-Login, mehrere Filialen. Jeder Standort hat eigenen Kalender, eigene Fotos und eigene Frequenz.',
  },
] as const

export const GBP_CONTROLS = [
  {
    icon: 'map-pin',
    title: 'Profil & Leistungen in Simy',
    desc: 'Beschreibung, Kategorien, Öffnungszeiten und Services bearbeiten — KI hilft bei Texten. Kein Hin-und-her im Google-Editor.',
  },
  {
    icon: 'search',
    title: 'Profil-Check mit Prioritäten',
    desc: 'Audit zeigt, was fehlt: zu wenige Fotos, unbeantwortete Reviews, schwache Beschreibung. Mit direktem Sprung zum Beheben.',
  },
  {
    icon: 'chart',
    title: 'Insights: Klicks, Anrufe, Routen',
    desc: 'Maps-Aufrufe, Anrufe, Website-Klicks und Wegbeschreibungen — du siehst, welche kostenlosen Aktionen das Profil bringt.',
  },
] as const

export const GBP_DOES_LIST = [
  'Jahreskalender: KI plant Themen, Simy postet 1–4× pro Woche automatisch',
  'Foto-Pool: freigegebene Bilder mit KI-Text 1–3× pro Woche auf Google',
  'Reviews: neue Bewertungen holen und automatisch beantworten',
  'Mehrere Standorte aus einem Google-Konto steuern',
  'Profil, Kategorien, Öffnungszeiten und Leistungen in Simy pflegen',
  'Insights: Maps-Aufrufe, Anrufe, Website-Klicks, Routen',
]
