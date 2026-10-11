/**
 * Course-category «Wichtig!» hints for enrollment confirmation emails.
 *
 * Stored on course_categories.email_important_notice as newline-separated
 * plain text (admin UI). Legacy rows may contain raw <li>…</li> HTML.
 */
import { escapeHtml } from '~/server/utils/branded-email'

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
