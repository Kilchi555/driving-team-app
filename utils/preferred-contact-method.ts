export const PREFERRED_CONTACT_METHODS = ['phone', 'sms', 'whatsapp', 'email'] as const
export type PreferredContactMethod = (typeof PREFERRED_CONTACT_METHODS)[number]

export const PREFERRED_CONTACT_NOTE_TAG = 'Bevorzugter Kontakt'

export const PREFERRED_CONTACT_OPTIONS: Array<{
  value: PreferredContactMethod
  label: string
  requires: 'phone' | 'email'
}> = [
  { value: 'phone', label: 'Telefon', requires: 'phone' },
  { value: 'sms', label: 'SMS', requires: 'phone' },
  { value: 'whatsapp', label: 'WhatsApp', requires: 'phone' },
  { value: 'email', label: 'E-Mail', requires: 'email' },
]

export function isPreferredContactMethod(value: unknown): value is PreferredContactMethod {
  return PREFERRED_CONTACT_METHODS.includes(value as PreferredContactMethod)
}

export function preferredContactLabel(value: string | null | undefined): string {
  return PREFERRED_CONTACT_OPTIONS.find(opt => opt.value === value)?.label || ''
}

export function preferredContactNoteLine(value: PreferredContactMethod): string {
  return `${PREFERRED_CONTACT_NOTE_TAG}: ${preferredContactLabel(value)}`
}

const KNOWN_CONTACT_LABELS = new Set(PREFERRED_CONTACT_OPTIONS.map(opt => opt.label))

export function parsePreferredContactFromNotes(notes: string | null | undefined): string {
  if (!notes) return ''
  const re = new RegExp(`^${PREFERRED_CONTACT_NOTE_TAG}:\\s*(.+)$`, 'gim')
  let last = ''
  let match: RegExpExecArray | null
  while ((match = re.exec(notes)) !== null) {
    last = match[1]?.trim() || ''
  }
  return KNOWN_CONTACT_LABELS.has(last) ? last : ''
}

export function isPreferredContactNoteLine(line: string): boolean {
  return new RegExp(`^${PREFERRED_CONTACT_NOTE_TAG}:`, 'i').test(line.trim())
}

/** Drop any existing tag lines, then append the validated method. */
export function upsertPreferredContactNote(
  notes: string | null | undefined,
  method: PreferredContactMethod,
): string {
  const without = String(notes || '')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !isPreferredContactNoteLine(line))
    .join('\n')
    .trim()
  return [without, preferredContactNoteLine(method)].filter(Boolean).join('\n')
}

export function customerPreferredContactIntro(label: string): string {
  switch (label) {
    case 'WhatsApp':
      return 'vielen Dank für deine Anfrage! Wir schreiben dir in Kürze auf WhatsApp.'
    case 'SMS':
      return 'vielen Dank für deine Anfrage! Wir schreiben dir in Kürze eine SMS.'
    case 'E-Mail':
      return 'vielen Dank für deine Anfrage! Wir schreiben dir in Kürze eine E-Mail.'
    case 'Telefon':
      return 'vielen Dank für deine Anfrage! Wir rufen dich in Kürze an.'
    default:
      return ''
  }
}
