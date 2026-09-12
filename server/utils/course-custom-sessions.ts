/**
 * Central validation for client-supplied custom course sessions.
 *
 * Authoritative tenant always comes from the server-side course (or
 * authenticated profile) — never from the client as an authorization boundary.
 *
 * Public enrollment may swap a session onto another *public* course of the
 * *same tenant* (available-sessions). Cross-tenant and private-course IDs
 * fail closed.
 */

import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateUUID } from '~/server/utils/validators'
import {
  COURSE_SESSIONS_COURSE_FK,
  ENROLL_COURSE_SESSION_COLUMNS,
  courseSessionsEmbed,
} from '~/server/utils/course-session-embed'

export const PUBLIC_ENROLLABLE_STATUSES = ['active', 'scheduled'] as const

const INVALID_SESSION = 'Ungültige Session-Auswahl'
const COURSE_NOT_FOUND = 'Course not found'

export type CustomSessionMap = Record<string, Record<string, unknown>>

export type ResolvedCourseSession = {
  id: string
  course_id: string
  tenant_id: string
  sari_session_id: string | null
  start_time: string | null
  end_time: string | null
  is_public: boolean
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  if (value == null || value === '') return []
  return [String(value).trim()]
}

function rejectInvalidSession(): never {
  throw createError({ statusCode: 400, statusMessage: INVALID_SESSION })
}

function rejectNotFound(): never {
  throw createError({ statusCode: 404, statusMessage: COURSE_NOT_FOUND })
}

/**
 * Extract UUID / SARI pointers from a custom_sessions payload.
 * Fails closed on malformed UUIDs. Empty / null is valid (no custom sessions).
 */
export function collectCustomSessionPointers(customSessions: unknown): {
  sessionIds: string[]
  courseIds: string[]
  sariIds: string[]
  empty: boolean
} {
  if (customSessions == null) {
    return { sessionIds: [], courseIds: [], sariIds: [], empty: true }
  }
  if (!isPlainObject(customSessions)) {
    rejectInvalidSession()
  }

  const sessionIds: string[] = []
  const courseIds: string[] = []
  const sariIds: string[] = []

  const entries = Object.values(customSessions)
  if (entries.length === 0) {
    return { sessionIds: [], courseIds: [], sariIds: [], empty: true }
  }

  for (const raw of entries) {
    if (!isPlainObject(raw)) {
      rejectInvalidSession()
    }
    if (raw.sessionId != null && raw.sessionId !== '') {
      const id = String(raw.sessionId)
      if (!validateUUID(id).valid) rejectInvalidSession()
      sessionIds.push(id)
    }
    if (raw.courseId != null && raw.courseId !== '') {
      const id = String(raw.courseId)
      if (!validateUUID(id).valid) rejectInvalidSession()
      courseIds.push(id)
    }
    for (const sari of [
      ...asIdList(raw.sariSessionIds),
      ...asIdList(raw.sariSessionId),
    ]) {
      sariIds.push(sari)
    }
  }

  return {
    sessionIds: [...new Set(sessionIds)],
    courseIds: [...new Set(courseIds)],
    sariIds: [...new Set(sariIds)],
    empty: false,
  }
}

async function loadSessionsByIds(
  supabase: SupabaseClient,
  tenantId: string,
  sessionIds: string[],
): Promise<ResolvedCourseSession[]> {
  if (sessionIds.length === 0) return []

  const { data, error } = await supabase
    .from('course_sessions')
    .select(`
      id,
      course_id,
      tenant_id,
      sari_session_id,
      start_time,
      end_time,
      courses!${COURSE_SESSIONS_COURSE_FK}(id, tenant_id, is_public)
    `)
    .in('id', sessionIds)
    .eq('tenant_id', tenantId)

  if (error) {
    rejectInvalidSession()
  }

  return (data || []).map(rowToResolved)
}

async function loadSessionsBySariIds(
  supabase: SupabaseClient,
  tenantId: string,
  sariIds: string[],
): Promise<ResolvedCourseSession[]> {
  if (sariIds.length === 0) return []

  const { data, error } = await supabase
    .from('course_sessions')
    .select(`
      id,
      course_id,
      tenant_id,
      sari_session_id,
      start_time,
      end_time,
      courses!${COURSE_SESSIONS_COURSE_FK}(id, tenant_id, is_public)
    `)
    .in('sari_session_id', sariIds)
    .eq('tenant_id', tenantId)

  if (error) {
    rejectInvalidSession()
  }

  return (data || []).map(rowToResolved)
}

function rowToResolved(row: any): ResolvedCourseSession {
  const course = Array.isArray(row.courses) ? row.courses[0] : row.courses
  const sessionTenant = row.tenant_id != null ? String(row.tenant_id) : ''
  const courseTenant = course?.tenant_id != null ? String(course.tenant_id) : ''
  // Prefer the parent course tenant. If session and course disagree, fail closed later.
  const tenant_id = courseTenant || sessionTenant
  return {
    id: String(row.id),
    course_id: String(row.course_id),
    tenant_id,
    sari_session_id: row.sari_session_id != null ? String(row.sari_session_id) : null,
    start_time: row.start_time ?? null,
    end_time: row.end_time ?? null,
    is_public: course?.is_public === true,
  }
}

function resolveEntrySessions(
  byId: Map<string, ResolvedCourseSession>,
  bySari: Map<string, ResolvedCourseSession>,
  entry: Record<string, unknown>,
): ResolvedCourseSession[] {
  const found: ResolvedCourseSession[] = []
  const seen = new Set<string>()
  const push = (row: ResolvedCourseSession | undefined) => {
    if (!row || seen.has(row.id)) return
    seen.add(row.id)
    found.push(row)
  }
  if (entry.sessionId) {
    push(byId.get(String(entry.sessionId)))
  }
  for (const sari of [
    ...asIdList(entry.sariSessionIds),
    ...asIdList(entry.sariSessionId),
  ]) {
    push(bySari.get(sari))
  }
  return found
}

/**
 * Validate customSessions against the authoritative tenant/course.
 *
 * @param requirePublic — public enrollment/catalog: parent course must be public
 * @param enrollmentCourseId — the course being booked (used for ownership checks)
 */
export async function assertCustomSessionsForTenant(opts: {
  supabase: SupabaseClient
  tenantId: string
  customSessions: unknown
  requirePublic: boolean
  enrollmentCourseId?: string
}): Promise<{ sanitized: CustomSessionMap | null; sessions: ResolvedCourseSession[] }> {
  const { supabase, tenantId, customSessions, requirePublic, enrollmentCourseId } = opts

  if (!validateUUID(tenantId).valid) {
    rejectInvalidSession()
  }
  if (enrollmentCourseId != null && enrollmentCourseId !== '' && !validateUUID(enrollmentCourseId).valid) {
    rejectInvalidSession()
  }

  const pointers = collectCustomSessionPointers(customSessions)
  if (pointers.empty) {
    return { sanitized: null, sessions: [] }
  }

  if (
    pointers.sessionIds.length === 0 &&
    pointers.sariIds.length === 0
  ) {
    rejectInvalidSession()
  }

  const [byUuid, bySariRows] = await Promise.all([
    loadSessionsByIds(supabase, tenantId, pointers.sessionIds),
    loadSessionsBySariIds(supabase, tenantId, pointers.sariIds),
  ])

  if (pointers.sessionIds.length > 0 && byUuid.length !== pointers.sessionIds.length) {
    rejectInvalidSession()
  }

  const byId = new Map(byUuid.map((s) => [s.id, s]))
  const bySari = new Map(
    [...byUuid, ...bySariRows]
      .filter((s) => s.sari_session_id)
      .map((s) => [s.sari_session_id as string, s]),
  )

  if (pointers.sariIds.length > 0) {
    for (const sari of pointers.sariIds) {
      if (!bySari.has(sari)) {
        rejectInvalidSession()
      }
    }
  }

  const source = customSessions as CustomSessionMap
  const sanitized: CustomSessionMap = {}
  const resolved: ResolvedCourseSession[] = []

  for (const [position, raw] of Object.entries(source)) {
    if (!isPlainObject(raw)) {
      rejectInvalidSession()
    }
    const matches = resolveEntrySessions(byId, bySari, raw)
    if (matches.length === 0) {
      rejectInvalidSession()
    }
    for (const match of matches) {
      if (match.tenant_id !== tenantId) {
        rejectInvalidSession()
      }
      if (requirePublic && match.is_public !== true) {
        rejectInvalidSession()
      }
      if (raw.courseId && String(raw.courseId) !== match.course_id) {
        rejectInvalidSession()
      }
    }

    const claimedSari = [
      ...asIdList(raw.sariSessionIds),
      ...asIdList(raw.sariSessionId),
    ]
    for (const id of claimedSari) {
      const row = bySari.get(id)
      if (!row || row.tenant_id !== tenantId) {
        rejectInvalidSession()
      }
      if (requirePublic && row.is_public !== true) {
        rejectInvalidSession()
      }
    }

    resolved.push(...matches)
    const dbSari = matches
      .map((m) => m.sari_session_id)
      .filter((id): id is string => !!id)
    const primary = matches[0]
    sanitized[position] = {
      ...raw,
      sessionId: primary.id,
      courseId: primary.course_id,
      sariSessionIds: dbSari.length ? dbSari : claimedSari,
      sariSessionId: primary.sari_session_id,
    }
  }

  return { sanitized, sessions: resolved }
}

export type PublicEnrollableCourse = Record<string, any> & {
  id: string
  tenant_id: string
  is_public: boolean
  status: string
}

/**
 * Load a publicly enrollable course. Tenant is taken from the course row.
 * A client-supplied tenantId, if present, must match or the course is 404.
 */
export async function loadPublicCourseForEnrollment(
  supabase: SupabaseClient,
  courseId: unknown,
  requestedTenantId?: unknown,
): Promise<PublicEnrollableCourse> {
  if (!validateUUID(courseId as string).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields' })
  }
  if (requestedTenantId != null && requestedTenantId !== '') {
    if (!validateUUID(requestedTenantId as string).valid) {
      rejectNotFound()
    }
  }

  const { data: course, error } = await supabase
    .from('courses')
    .select(`
      *,
      course_category:course_categories(code, name, allow_partial_enrollment, partial_start_position, partial_price_rappen),
      ${courseSessionsEmbed(ENROLL_COURSE_SESSION_COLUMNS)}
    `)
    .eq('id', courseId as string)
    .eq('is_public', true)
    .maybeSingle()

  if (error || !course) {
    rejectNotFound()
  }

  if (course.is_public !== true || course.is_active === false) {
    rejectNotFound()
  }

  if (!PUBLIC_ENROLLABLE_STATUSES.includes(course.status)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dieser Kurs kann derzeit nicht gebucht werden.',
    })
  }

  if (
    requestedTenantId != null &&
    requestedTenantId !== '' &&
    requestedTenantId !== course.tenant_id
  ) {
    rejectNotFound()
  }

  return course as PublicEnrollableCourse
}
