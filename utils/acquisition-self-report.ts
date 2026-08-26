export const ACQUISITION_SELF_REPORT_OPTIONS = [
  { value: 'google_ads', label: 'Google-Werbung' },
  { value: 'google_organic', label: 'Google-Suche' },
  { value: 'google_maps', label: 'Google Maps / Bewertungen' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'recommendation', label: 'Empfehlung / Freund' },
  { value: 'flyer', label: 'Flyer / Plakat' },
  { value: 'passing_by', label: 'Vorbeigefahren / Schild' },
  { value: 'school', label: 'Schule / Betrieb' },
  { value: 'other', label: 'Anderes' },
] as const

export type AcquisitionSelfReportValue =
  (typeof ACQUISITION_SELF_REPORT_OPTIONS)[number]['value']

const OPTION_VALUES = new Set<string>(
  ACQUISITION_SELF_REPORT_OPTIONS.map((o) => o.value),
)

const NEEDS_NOTE = new Set<AcquisitionSelfReportValue>(['recommendation', 'other'])

export function acquisitionSelfReportNeedsNote(value: string | null | undefined): boolean {
  return !!value && NEEDS_NOTE.has(value as AcquisitionSelfReportValue)
}

export function acquisitionSelfReportLabel(value: string | null | undefined): string {
  if (!value) return ''
  const match = ACQUISITION_SELF_REPORT_OPTIONS.find((o) => o.value === value)
  return match?.label ?? value
}

const TRACKED_LABELS: Record<string, string> = {
  google_ads: 'Google-Werbung',
  google_organic: 'Google-Suche',
  google_maps: 'Google Maps / Bewertungen',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  recommendation: 'Empfehlung / Freund',
  flyer: 'Flyer / Plakat',
  passing_by: 'Vorbeigefahren / Schild',
  school: 'Schule / Betrieb',
  other: 'Anderes',
}

export function trackedAcquisitionLabel(
  source?: string | null,
  medium?: string | null,
  campaign?: string | null,
): string {
  if (medium === 'self_reported' && source) {
    return TRACKED_LABELS[source] ?? acquisitionSelfReportLabel(source)
  }
  if (source === 'offline' && medium === 'staff') return 'Team / vor Ort'
  if (source === 'organic/direct' || (source === 'direct' && (medium === 'none' || medium === 'organic'))) {
    return 'Organisch / Direkt'
  }
  if (medium === 'cpc' || medium === 'ppc' || medium === 'paid') {
    if ((source || '').toLowerCase().includes('facebook') || (source || '').toLowerCase().includes('instagram')) {
      return campaign ? `Meta Ads · ${campaign}` : 'Meta Ads'
    }
    return campaign ? `Google Ads · ${campaign}` : 'Google Ads'
  }
  if (medium === 'paid_social') return campaign ? `Meta Ads · ${campaign}` : 'Meta Ads'
  if (source) return campaign ? `${source} · ${campaign}` : source
  return ''
}

export function customerOriginDisplay(student: {
  acquisition_self_reported?: string | null
  acquisition_self_reported_note?: string | null
  acquisition_source?: string | null
  acquisition_medium?: string | null
  acquisition_campaign?: string | null
}): { label: string | null; note: string | null; tracked: string | null } {
  const selfLabel = acquisitionSelfReportLabel(student.acquisition_self_reported)
  const tracked = trackedAcquisitionLabel(
    student.acquisition_source,
    student.acquisition_medium,
    student.acquisition_campaign,
  )
  return {
    label: selfLabel || tracked || null,
    note: student.acquisition_self_reported_note || null,
    tracked: selfLabel && tracked && tracked !== selfLabel ? tracked : null,
  }
}

export function normalizeAcquisitionSelfReport(
  source: unknown,
  note?: unknown,
): { source: AcquisitionSelfReportValue; note: string | null } | null {
  if (typeof source !== 'string') return null
  const cleaned = source.trim()
  if (!OPTION_VALUES.has(cleaned)) return null

  const noteText = typeof note === 'string' ? note.trim().slice(0, 200) : ''
  if (acquisitionSelfReportNeedsNote(cleaned) && !noteText) return null

  return {
    source: cleaned as AcquisitionSelfReportValue,
    note: noteText || null,
  }
}
