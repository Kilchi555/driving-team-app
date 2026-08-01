/**
 * Recommended re-mail defaults per marketing campaign kind.
 * Applied automatically on first schedule setup; admin can always override.
 */

export type CampaignOfferKind = 'affiliate' | 'course' | 'discount' | 'category' | 'generic'

export type RepeatMode = 'once' | 'repeat'

export interface CampaignRepeatDefaults {
  kind: CampaignOfferKind
  label: string
  repeatMode: RepeatMode
  repeatIntervalDays: number
  tip: string
}

export function inferCampaignOfferKind(input: {
  themeKey?: string | null
  ctaType?: string | null
  discountCode?: string | null
  courseId?: string | null
  segmentFilter?: Record<string, any> | null
  name?: string | null
} = {}): CampaignOfferKind {
  const offer = input.segmentFilter?.offer || {}
  const theme = String(input.themeKey || offer.theme_key || '').toLowerCase()
  const cta = String(input.ctaType || offer.cta_type || '').toLowerCase()
  const discount = input.discountCode || offer.discount_code
  const courseId = input.courseId || offer.course_id
  const name = String(input.name || '').toLowerCase()

  if (theme === 'affiliate' || cta === 'partner' || cta === 'ref') return 'affiliate'
  if (theme === 'course' || cta === 'course' || courseId) return 'course'
  if (theme === 'discount_promo' || discount) return 'discount'
  if (theme === 'category') return 'category'

  if (name.includes('affiliate') || name.includes('freunde werben') || name.includes('partner')) return 'affiliate'
  if (name.includes('kurs')) return 'course'
  if (name.includes('rabatt') || name.includes('%')) return 'discount'

  return 'generic'
}

export function defaultRepeatSettings(kind: CampaignOfferKind): CampaignRepeatDefaults {
  switch (kind) {
    case 'affiliate':
      return {
        kind,
        label: 'Affiliate / Partner',
        repeatMode: 'repeat',
        repeatIntervalDays: 60,
        tip: 'Empfehlung Affiliate: erneut nach 60 Tagen als sanfte Erinnerung — oder auf «Nur einmal» stellen.',
      }
    case 'course':
      return {
        kind,
        label: 'Kurs',
        repeatMode: 'repeat',
        repeatIntervalDays: 7,
        tip: 'Empfehlung Kurs: erneut nach 7 Tagen (Plätze / Reminder). Automatisierung vor Kursbeginn stoppen.',
      }
    case 'discount':
      return {
        kind,
        label: 'Rabatt',
        repeatMode: 'repeat',
        repeatIntervalDays: 14,
        tip: 'Empfehlung Rabatt: erneut nach 14 Tagen bis Ablauf. Bei sehr kurzer Gültigkeit eher 7 Tage.',
      }
    case 'category':
      return {
        kind,
        label: 'Kategorie',
        repeatMode: 'repeat',
        repeatIntervalDays: 14,
        tip: 'Empfehlung Kategorie-Aktion: erneut nach 14 Tagen.',
      }
    default:
      return {
        kind,
        label: 'Kampagne',
        repeatMode: 'once',
        repeatIntervalDays: 30,
        tip: 'Standard: Lead höchstens einmal. Bei zeitlich begrenzten Aktionen «Erneut» wählen.',
      }
  }
}

export function repeatDefaultsForCampaign(campaign: {
  name?: string | null
  segment_filter?: Record<string, any> | null
} | null | undefined): CampaignRepeatDefaults {
  return defaultRepeatSettings(inferCampaignOfferKind({
    name: campaign?.name,
    segmentFilter: campaign?.segment_filter,
  }))
}
