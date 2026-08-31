import type { ProspectRevenueModel } from '~/server/utils/website-prospect-types'

const BIG_CITY =
  /zürich|zurich|genève|genf|geneva|basel|bern|berne|lausanne|winterthur|luzern|lucerne|st\.?\s*gallen|lugano|biel|bienne/i

const VERTICAL: Record<
  string,
  { inquiries: [number, number]; close: number; db: number; noun: string }
> = {
  driving_school: { inquiries: [1, 3], close: 0.35, db: 1400, noun: 'Schüler' },
  mental_coach: { inquiries: [1, 2], close: 0.3, db: 700, noun: 'Kunden' },
  coaching: { inquiries: [1, 2], close: 0.3, db: 700, noun: 'Kunden' },
  therapy: { inquiries: [1, 2], close: 0.28, db: 650, noun: 'Patienten' },
  tutoring: { inquiries: [1, 3], close: 0.35, db: 500, noun: 'Schüler' },
  fitness: { inquiries: [2, 4], close: 0.3, db: 350, noun: 'Kunden' },
  music_school: { inquiries: [1, 2], close: 0.35, db: 600, noun: 'Schüler' },
  dog_training: { inquiries: [1, 2], close: 0.35, db: 400, noun: 'Hundehalter' },
  massage: { inquiries: [2, 4], close: 0.35, db: 280, noun: 'Kunden' },
  consulting: { inquiries: [1, 2], close: 0.25, db: 900, noun: 'Kunden' },
  generic: { inquiries: [1, 2], close: 0.3, db: 500, noun: 'Kunden' },
}

export function cityRevenueMultiplier(city?: string | null): number {
  const c = String(city || '').trim()
  if (!c) return 1
  if (BIG_CITY.test(c)) return 1.15
  return 0.85
}

export function buildProspectRevenueModel(input: {
  businessType: string
  city?: string | null
  opportunity?: number | null
}): ProspectRevenueModel {
  const spec = VERTICAL[input.businessType] || VERTICAL.generic
  const cityMul = cityRevenueMultiplier(input.city)
  const opp = input.opportunity ?? 55
  const oppMul = opp >= 70 ? 1 : opp >= 50 ? 0.85 : 0.65
  const inquiriesLow = spec.inquiries[0]
  const inquiriesHigh = spec.inquiries[1]
  const monthlyLow = Math.round(inquiriesLow * spec.close * spec.db * cityMul * oppMul)
  const monthlyHigh = Math.round(inquiriesHigh * spec.close * spec.db * cityMul * Math.min(1, oppMul + 0.1))

  return {
    business_type: spec === VERTICAL[input.businessType] ? input.businessType : 'generic',
    city: input.city || null,
    city_multiplier: cityMul,
    inquiries_low: inquiriesLow,
    inquiries_high: inquiriesHigh,
    close_rate: spec.close,
    db_per_customer_chf: spec.db,
    monthly_low_chf: monthlyLow,
    monthly_high_chf: monthlyHigh,
    yearly_low_chf: monthlyLow * 12,
    yearly_high_chf: monthlyHigh * 12,
    assumptions: [
      `Konservativ: ${inquiriesLow}–${inquiriesHigh} zusätzliche Anfragen / Monat dank besserer Local-SEO und klarem CTA.`,
      `Abschlussquote ${Math.round(spec.close * 100)} % — nicht jeder Anruf wird ${spec.noun}.`,
      `Deckungsbeitrag CHF ${spec.db} pro neuem Auftrag (nicht der Listenpreis).`,
      cityMul > 1
        ? `Stadtzuschlag ${cityMul}× für ${input.city}.`
        : input.city
          ? `Kleinerer Markt ${input.city}: ${cityMul}×.`
          : 'Ohne Stadt: neutraler Markt.',
      'Das ist eine Range mit Annahmen, keine Garantie.',
    ],
  }
}

export function formatChf(value: number) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(value)
}
