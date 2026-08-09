/**
 * Curated stroke icons for tenant website trust row / accents.
 * Keys only — no free tenant icon uploads in v1.
 */
export const WEBSITE_ICON_KEYS = [
  'clock',
  'star',
  'shield',
  'map',
  'phone',
  'calendar',
  'check',
  'chat',
] as const

export type WebsiteIconKey = (typeof WEBSITE_ICON_KEYS)[number]

export function isWebsiteIconKey(v: unknown): v is WebsiteIconKey {
  return typeof v === 'string' && (WEBSITE_ICON_KEYS as readonly string[]).includes(v)
}

/** Default trust-row icon mapping by label heuristics */
export function trustIconForLabel(label: string, index: number): WebsiteIconKey {
  const l = (label || '').toLowerCase()
  if (/online|buch|24/.test(l)) return 'clock'
  if (/bewert|★|stern|google/.test(l)) return 'star'
  if (/schweiz|ch|sicher|schutz/.test(l)) return 'shield'
  if (/sms|erinner|nachricht/.test(l)) return 'chat'
  if (/telefon|anruf/.test(l)) return 'phone'
  if (/termin|kalender/.test(l)) return 'calendar'
  const fallback: WebsiteIconKey[] = ['clock', 'star', 'shield', 'check', 'calendar', 'map']
  return fallback[index % fallback.length]
}
