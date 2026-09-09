/**
 * Course enrollment emails must be real addresses or NULL.
 * Empty string '' collides on unique (course_id, email) indexes in Postgres.
 */
export function normalizeEnrollmentEmail(email: unknown): string | null {
  const trimmed = String(email ?? '').trim().toLowerCase()
  return trimmed || null
}
