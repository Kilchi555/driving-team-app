/**
 * Course-category «Wichtig!» hints for enrollment confirmation emails.
 *
 * Stored on course_categories.email_important_notice as newline-separated
 * plain text (admin UI). Legacy rows may contain raw <li>…</li> HTML.
 *
 * Lookup key (confirmation email):
 * 1. courses.course_category_id (FK) — preferred for modern admin-created courses
 * 2. courses.category (legacy string code) — SARI / older rows
 *
 * Do not conflate with enrollment_fields (required/optional/hidden form inputs).
 */
import { escapeHtml } from '~/server/utils/branded-email'

export type CourseCategoryNoticeLookup =
  | { by: 'id'; value: string }
  | { by: 'code'; value: string }

/**
 * Decide how to load course_categories for email hints.
 * Prefer FK; fall back to legacy category code. Returns null when neither is set.
 */
export function resolveCourseCategoryNoticeLookup(
  course: { course_category_id?: string | null; category?: string | null } | null | undefined,
): CourseCategoryNoticeLookup | null {
  const id = typeof course?.course_category_id === 'string'
    ? course.course_category_id.trim()
    : course?.course_category_id
      ? String(course.course_category_id).trim()
      : ''
  if (id) return { by: 'id', value: id }

  const code = typeof course?.category === 'string'
    ? course.category.trim()
    : course?.category
      ? String(course.category).trim()
      : ''
  if (code) return { by: 'code', value: code }

  return null
}

/**
 * Build <li>…</li> markup for the yellow confirmation-email status box.
 * Returns '' when there is no admin-configured notice (caller may use fallbacks).
 */
export function buildCourseImportantNoticeListItems(
  notice: string | null | undefined,
): string {
  if (!notice?.trim()) return ''

  const raw = notice.trim()

  // Legacy HTML path: preserve existing <li> markup as stored.
  if (raw.includes('<li>')) {
    return raw
  }

  // Admin UI plain-text lines → escaped bullet items (order preserved).
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `\n                <li>${escapeHtml(s)}</li>`)
    .join('')
}

/** Split stored notice into ordered plain-text items (for admin UI / tests). */
export function parseCourseImportantNoticeItems(
  notice: string | null | undefined,
): string[] {
  if (!notice?.trim()) return []

  const raw = notice.trim()
  if (raw.includes('<li>')) {
    return [...raw.matchAll(/<li>([\s\S]*?)<\/li>/gi)]
      .map((m) => m[1].trim())
      .filter(Boolean)
  }

  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Join admin UI items for DB persistence (empty rows dropped). */
export function serializeCourseImportantNoticeItems(items: string[]): string {
  return items.map((s) => s.trim()).filter(Boolean).join('\n')
}
