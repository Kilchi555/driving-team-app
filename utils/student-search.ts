// Shared student/customer free-text search matching.
// Used by customers list, StudentSelector, etc. so every UI behaves the same.

export interface StudentSearchable {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
}

/** Lowercase, strip diacritics, collapse whitespace. "Müller " → "muller" */
function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match a person against a free-text query.
 *
 * - Trims trailing/leading spaces ("Matteo " still finds Matteo)
 * - Multi-token: every token must appear somewhere in name/email/phone
 *   ("Matteo Bernardoni" and "Bernardoni Matteo" both work)
 * - Accent-insensitive ("Muller" finds "Müller")
 * - Digit tokens (≥3) also match against phone digits only
 */
export function matchesStudentSearch(
  student: StudentSearchable,
  rawQuery: string
): boolean {
  const query = normalizeSearchText(rawQuery || '')
  if (!query) return true

  const tokens = query.split(' ').filter(Boolean)
  const haystack = normalizeSearchText(
    [student.first_name, student.last_name, student.email, student.phone]
      .filter(Boolean)
      .join(' ')
  )
  const phoneDigits = String(student.phone || '').replace(/\D/g, '')

  return tokens.every((token) => {
    if (haystack.includes(token)) return true
    const digits = token.replace(/\D/g, '')
    if (digits.length < 3 || !phoneDigits) return false
    if (phoneDigits.includes(digits)) return true
    // CH local "079…" vs stored "+41 79…"
    if (digits.startsWith('0') && phoneDigits.includes(digits.slice(1))) return true
    return false
  })
}

export function filterByStudentSearch<T extends StudentSearchable>(
  students: T[],
  rawQuery: string
): T[] {
  const query = normalizeSearchText(rawQuery || '')
  if (!query) return students
  return students.filter((s) => matchesStudentSearch(s, query))
}
