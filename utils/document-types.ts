const ALLOWED_DOCUMENT_TYPE_PREFIXES = [
  'lernfahrausweis',
  'fuehrerschein',
  'medical_certificate',
  'license',
  'id_card',
  'id_document',
  'passport',
  'ausweis',
  'pass',
  'other',
] as const

export function isAllowedUserDocumentType(type: unknown): boolean {
  if (typeof type !== 'string') return false
  if (!/^[a-z][a-z0-9_]{0,40}$/.test(type)) return false
  return ALLOWED_DOCUMENT_TYPE_PREFIXES.some(
    (prefix) => type === prefix || type.startsWith(`${prefix}_`),
  )
}
