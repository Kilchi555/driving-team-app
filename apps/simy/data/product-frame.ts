export type ProductFrameIndustry =
  | 'fahrschule'
  | 'coaching'
  | 'consulting'
  | 'personal-training'
  | 'nachhilfe'
  | 'musikschule'
  | 'hundeschule'
  | 'massage'

export type ProductFramePreview = {
  eyebrow: string
  headline: string
  about: string
  prices: { label: string; value: string }[]
  hero: string
  reviewName: string
  reviewText: string
}

export const PRODUCT_FRAME_PREVIEWS: Record<ProductFrameIndustry, ProductFramePreview> = {
  fahrschule: {
    eyebrow: 'Fahrschule Zürich',
    headline: 'Fahrstunden — klar, lokal, online.',
    about: 'Probestunde, Fahrstunden und VKU — online buchbar, ohne WhatsApp-Pingpong.',
    prices: [
      { label: 'Probe', value: 'CHF 89' },
      { label: 'Fahrstunde', value: 'CHF 95' },
      { label: 'VKU', value: 'CHF 180' },
    ],
    hero: '/heroes/fahrschule.webp',
    reviewName: 'Anna M.',
    reviewText: 'Sehr geduldige Erklärungen, Prüfung im ersten Versuch bestanden.',
  },
  coaching: {
    eyebrow: 'Coaching Zürich',
    headline: 'Sitzungen — klar, lokal, online.',
    about: 'Erstgespräch und Sitzungspakete. Termine selbst buchen, QR-Rechnung danach.',
    prices: [
      { label: 'Erstgespräch', value: 'CHF 80' },
      { label: 'Sitzung', value: 'CHF 160' },
      { label: '10er', value: 'CHF 1’450' },
    ],
    hero: '/heroes/coaching.webp',
    reviewName: 'Lena K.',
    reviewText: 'Klare Struktur, ruhige Atmosphäre — nach drei Sitzungen merke ich den Unterschied.',
  },
  consulting: {
    eyebrow: 'Consulting Zürich',
    headline: 'Beratung — klar, lokal, online.',
    about: 'Kickoff, Stunden und Tagessätze. Termine und Offerten an einem Ort.',
    prices: [
      { label: 'Kickoff', value: 'CHF 180' },
      { label: 'Stunde', value: 'CHF 220' },
      { label: 'Tag', value: 'CHF 1’600' },
    ],
    hero: '/heroes/consulting.webp',
    reviewName: 'Marc B.',
    reviewText: 'Präzise, pünktlich, ohne Berater-Sprech. Klare Empfehlung.',
  },
  'personal-training': {
    eyebrow: 'Personal Training Zürich',
    headline: 'Training — klar, lokal, online.',
    about: 'Probe, 1:1-Sessions und 10er-Pakete. Früh-Slots ab 06:30, online buchbar.',
    prices: [
      { label: 'Probe', value: 'CHF 49' },
      { label: 'Session', value: 'CHF 95' },
      { label: '10er', value: 'CHF 850' },
    ],
    hero: '/heroes/personal-training.webp',
    reviewName: 'Julia R.',
    reviewText: 'Endlich ein Trainer, der den Plan anpasst. Nach 8 Wochen messbar fitter.',
  },
  nachhilfe: {
    eyebrow: 'Nachhilfe Zürich',
    headline: 'Lektionen — klar, lokal, online.',
    about: 'Schnupperlektion, Einzelstunden und 10er. Eltern sehen Termine und Rechnung klar.',
    prices: [
      { label: 'Schnupper', value: 'CHF 40' },
      { label: 'Lektion', value: 'CHF 65' },
      { label: '10er', value: 'CHF 590' },
    ],
    hero: '/heroes/nachhilfe.webp',
    reviewName: 'Sarah T.',
    reviewText: 'Unser Sohn hat die Note um zwei Stufen verbessert.',
  },
  musikschule: {
    eyebrow: 'Musikschule Zürich',
    headline: 'Unterricht — klar, lokal, online.',
    about: 'Schnupperstunde, Wochenlektion und Semester. Instrumente als klare Angebote.',
    prices: [
      { label: 'Schnupper', value: 'CHF 45' },
      { label: 'Stunde', value: 'CHF 75' },
      { label: 'Semester', value: 'CHF 720' },
    ],
    hero: '/heroes/musikschule.webp',
    reviewName: 'Nina W.',
    reviewText: 'Geduldiger Unterricht, unser Kind übt endlich freiwillig.',
  },
  hundeschule: {
    eyebrow: 'Hundeschule Zürich',
    headline: 'Training — klar, lokal, online.',
    about: 'Kennenlernen, Einzeltraining und Welpenkurse. Plätze online statt per Chat.',
    prices: [
      { label: 'Kennenlernen', value: 'CHF 60' },
      { label: 'Einzel', value: 'CHF 95' },
      { label: 'Welpenkurs', value: 'CHF 280' },
    ],
    hero: '/heroes/hundeschule.webp',
    reviewName: 'Tobias L.',
    reviewText: 'Unser Hund ist nach drei Lektionen deutlich ruhiger an der Leine.',
  },
  massage: {
    eyebrow: 'Massage Zürich',
    headline: 'Behandlungen — klar, lokal, online.',
    about: '30, 60 oder 90 Minuten. Abendslots online buchen — ohne Telefonkette.',
    prices: [
      { label: '30 Min', value: 'CHF 79' },
      { label: '60 Min', value: 'CHF 129' },
      { label: '90 Min', value: 'CHF 179' },
    ],
    hero: '/heroes/massage.webp',
    reviewName: 'Elena S.',
    reviewText: 'Ruhige Praxis, präzise Arbeit. Die Nackenprobleme sind weg.',
  },
}

const INDUSTRIES = Object.keys(PRODUCT_FRAME_PREVIEWS) as ProductFrameIndustry[]

export function resolveProductFrameIndustry(opts: {
  industry?: string
  previewHost?: string
}): ProductFrameIndustry {
  if (opts.industry && INDUSTRIES.includes(opts.industry as ProductFrameIndustry)) {
    return opts.industry as ProductFrameIndustry
  }
  const host = opts.previewHost || ''
  const fromHost = host.match(/deine-([a-z0-9-]+)/)?.[1]
  if (fromHost && INDUSTRIES.includes(fromHost as ProductFrameIndustry)) {
    return fromHost as ProductFrameIndustry
  }
  if (host.includes('fahrschule')) return 'fahrschule'
  return 'fahrschule'
}
