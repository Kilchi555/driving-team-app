import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { normalizeEmail, normalizePhone } from '~/server/utils/sales-intelligence'

export const WEITERBILDUNG_DETAIL = 'Registrierung vorhanden · Teilnahme nicht bestätigt'

export type WeiterbildungCourse = {
  courseName: string
  courseStartDate: string | null
  label: string
}

export type WeiterbildungSignal =
  | { hasRegistration: false }
  | {
      hasRegistration: true
      registrationYear: number | null
      registrationStatus: 'confirmed'
      registrationCount: number
      courseName: string | null
      courseStartDate: string | null
      title: string
      detail: typeof WEITERBILDUNG_DETAIL
      courses: WeiterbildungCourse[]
    }

export type WeiterbildungCandidate = {
  id?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  deletedAt?: string | null
  categoryCode?: string | null
  courseId?: string | null
  courseName?: string | null
  courseStartDate?: string | null
  registrationDate?: string | null
  kind?: 'registration' | 'waitlist' | 'lead' | null
}

type ProspectContacts = {
  email?: string | null
  additional_emails?: string[] | null
  phone?: string | null
  additional_phones?: string[] | null
}

const NO_MATCH: WeiterbildungSignal = { hasRegistration: false }

function contactKeys(prospect: ProspectContacts): { emails: Set<string>; phones: Set<string> } {
  const emails = new Set<string>()
  const phones = new Set<string>()
  for (const value of [prospect.email, ...(prospect.additional_emails || [])]) {
    const email = normalizeEmail(value)
    if (email) emails.add(email)
  }
  for (const value of [prospect.phone, ...(prospect.additional_phones || [])]) {
    const phone = normalizePhone(value)
    if (phone) phones.add(phone)
  }
  return { emails, phones }
}

function dateKey(value?: string | null): string | null {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] || null
}

function dateLabel(iso: string | null): string | null {
  if (!iso) return null
  const [year, month, day] = iso.split('-')
  return `${day}.${month}.${year}`
}

function stamp(value?: string | null): number {
  const key = dateKey(value)
  return key ? Date.parse(`${key}T00:00:00Z`) : 0
}

function eligibleRow(row: WeiterbildungCandidate): boolean {
  if ((row.kind || 'registration') !== 'registration') return false
  if (row.categoryCode !== 'Fahrlehrer') return false
  if (row.deletedAt) return false
  return row.status === 'confirmed'
}

function phoneFallbackRows(pool: readonly WeiterbildungCandidate[], phones: Set<string>): WeiterbildungCandidate[] {
  const kept: WeiterbildungCandidate[] = []
  const seen = new Set<string>()
  for (const phone of phones) {
    const hits = pool.filter((row) => normalizePhone(row.phone) === phone)
    if (!hits.length) continue
    const identities = new Set<string>()
    let anchored = true
    for (const row of hits) {
      const email = normalizeEmail(row.email)
      if (!email) {
        anchored = false
        break
      }
      identities.add(email)
    }
    if (!anchored || identities.size !== 1) continue
    for (const row of hits) {
      const id = row.id || `${normalizeEmail(row.email)}|${phone}|${row.courseId || ''}|${row.registrationDate || ''}`
      if (seen.has(id)) continue
      seen.add(id)
      kept.push(row)
    }
  }
  return kept
}

export function buildWeiterbildungSignal(prospect: ProspectContacts, rows: readonly WeiterbildungCandidate[]): WeiterbildungSignal {
  const { emails, phones } = contactKeys(prospect)
  const pool = rows.filter(eligibleRow)
  const emailHits = pool.filter((row) => {
    const email = normalizeEmail(row.email)
    return !!email && emails.has(email)
  })
  const matched = emailHits.length ? emailHits : phoneFallbackRows(pool, phones)
  if (!matched.length) return NO_MATCH

  const ordered = [...matched].sort((left, right) => {
    const start = stamp(right.courseStartDate) - stamp(left.courseStartDate)
    if (start) return start
    return stamp(right.registrationDate) - stamp(left.registrationDate)
  })
  const seen = new Set<string>()
  const courses: WeiterbildungCourse[] = []
  for (const row of ordered) {
    const courseStartDate = dateKey(row.courseStartDate)
    const courseName = (row.courseName || '').trim()
    const key = row.courseId || `${courseName}|${courseStartDate || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    const when = dateLabel(courseStartDate)
    const label = [courseName, when].filter(Boolean).join(' · ')
    if (!label) continue
    courses.push({ courseName, courseStartDate, label })
  }
  const newest = dateKey(ordered[0].courseStartDate) || dateKey(ordered[0].registrationDate)
  const registrationYear = newest ? Number(newest.slice(0, 4)) : null
  const registrationCount = matched.length
  const title = registrationCount > 1
    ? `${registrationCount} Fahrlehrerweiterbildungen registriert`
    : registrationYear
      ? `Fahrlehrerweiterbildung-Anmeldung ${registrationYear}`
      : 'Fahrlehrerweiterbildung-Anmeldung'
  return {
    hasRegistration: true,
    registrationYear,
    registrationStatus: 'confirmed',
    registrationCount,
    courseName: courses[0]?.courseName || null,
    courseStartDate: courses[0]?.courseStartDate || null,
    title,
    detail: WEITERBILDUNG_DETAIL,
    courses,
  }
}

type QueryResult<T> = { data: T[] | null; error: { message?: string } | null }

type QueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => PromiseLike<QueryResult<{ id: string }>>
      in: (column: string, values: string[]) => {
        is: (column: string, value: null) => {
          eq: (column: string, value: string) => PromiseLike<QueryResult<RegistrationRow>>
        }
        then: PromiseLike<QueryResult<CourseRow>>['then']
      }
    }
  }
}

type CourseRow = { id: string; name?: string | null; course_start_date?: string | null }
type RegistrationRow = {
  id?: string | null
  email?: string | null
  phone?: string | null
  status?: string | null
  deleted_at?: string | null
  registration_date?: string | null
  course_id?: string | null
}

export async function loadSalesWeiterbildungSignal(
  prospect: ProspectContacts,
  supabase: QueryClient = getSupabaseAdmin() as unknown as QueryClient,
): Promise<WeiterbildungSignal> {
  const { emails, phones } = contactKeys(prospect)
  if (!emails.size && !phones.size) return NO_MATCH
  try {
    const categories = await supabase.from('course_categories').select('id').eq('code', 'Fahrlehrer')
    const categoryIds = (categories.data || []).map((row) => row.id).filter(Boolean)
    if (categories.error || !categoryIds.length) return NO_MATCH
    const courses = await supabase.from('courses').select('id, name, course_start_date').in('course_category_id', categoryIds)
    const courseRows = (courses.data || []) as CourseRow[]
    if (courses.error || !courseRows.length) return NO_MATCH
    const courseIds = courseRows.map((row) => row.id).filter(Boolean)
    const registrations = await supabase
      .from('course_registrations')
      .select('id, email, phone, status, deleted_at, registration_date, course_id')
      .in('course_id', courseIds)
      .is('deleted_at', null)
      .eq('status', 'confirmed')
    if (registrations.error) return NO_MATCH
    const byCourse = new Map(courseRows.map((row) => [row.id, row]))
    const rows: WeiterbildungCandidate[] = ((registrations.data || []) as RegistrationRow[]).map((row) => {
      const course = row.course_id ? byCourse.get(row.course_id) : undefined
      return {
        id: row.id,
        email: row.email,
        phone: row.phone,
        status: row.status,
        deletedAt: row.deleted_at,
        categoryCode: 'Fahrlehrer',
        courseId: row.course_id,
        courseName: course?.name || null,
        courseStartDate: course?.course_start_date || null,
        registrationDate: row.registration_date,
        kind: 'registration',
      }
    })
    return buildWeiterbildungSignal(prospect, rows)
  } catch {
    return NO_MATCH
  }
}
