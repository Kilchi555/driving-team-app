/**
 * Identity-preserving Course Session reconciliation for non-SARI course updates.
 *
 * Existing sessions are UPDATED in place (same UUID).
 * New sessions (no id) are INSERTed.
 * Removals are dependency-checked and blocked when unsafe.
 *
 * Never delete-all + recreate.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createError } from 'h3'
import { validateUUID } from '~/server/utils/validators'
import { zurichLocalToUtcIso } from '~/server/utils/zurich-time'
import { logger } from '~/utils/logger'

export type SessionPayload = {
  id?: string | null
  date: string
  start_time: string
  end_time: string
  description?: string | null
  instructor_type?: string | null
  staff_id?: string | null
  external_instructor_name?: string | null
  external_instructor_email?: string | null
  external_instructor_phone?: string | null
  allow_individual_booking?: boolean
  individual_price?: number
  individual_price_rappen?: number
  individual_booking_requires_confirmation?: boolean
  individual_booking_confirmation_text?: string | null
  room_id?: string | null
}

export type DbCourseSession = {
  id: string
  course_id: string
  tenant_id: string
  session_number: number
  start_time: string
  end_time: string
  room_id: string | null
  confirmation_status: string | null
}

export type SessionRowPatch = {
  start_time: string
  end_time: string
  description: string
  instructor_type: string | null
  staff_id: string | null
  external_instructor_name: string | null
  external_instructor_email: string | null
  external_instructor_phone: string | null
  allow_individual_booking: boolean
  individual_price_rappen: number
  individual_booking_requires_confirmation: boolean
  individual_booking_confirmation_text: string | null
  room_id: string | null
  updated_at: string
}

export type SavedSession = {
  id: string
  room_id: string | null
  start_time: string
  end_time: string
}

const INVALID_SESSION = 'Ungültige Session-Auswahl'
const REMOVAL_BLOCKED =
  'Session kann nicht entfernt werden: Es bestehen Abhängigkeiten (Buchungen, Anmeldungen, Bestätigungen oder Session-Tausch).'

function rejectInvalidSession(message = INVALID_SESSION): never {
  throw createError({ statusCode: 400, statusMessage: message })
}

function rejectForbidden(message: string): never {
  throw createError({ statusCode: 403, statusMessage: message })
}

function rejectConflict(message: string): never {
  throw createError({ statusCode: 409, statusMessage: message })
}

/** Build mutable session columns from a client payload item (no id / session_number). */
export function buildSessionPatch(
  session: SessionPayload,
  courseRoomId: string | null,
): SessionRowPatch {
  return {
    start_time: zurichLocalToUtcIso(session.date, session.start_time),
    end_time: zurichLocalToUtcIso(session.date, session.end_time),
    description: session.description || 'Session',
    instructor_type: session.instructor_type || null,
    staff_id: session.instructor_type === 'internal' ? (session.staff_id || null) : null,
    external_instructor_name: session.instructor_type === 'external' ? (session.external_instructor_name || null) : null,
    external_instructor_email: session.instructor_type === 'external' ? (session.external_instructor_email || null) : null,
    external_instructor_phone: session.instructor_type === 'external' ? (session.external_instructor_phone || null) : null,
    allow_individual_booking: session.allow_individual_booking ?? false,
    individual_price_rappen: session.allow_individual_booking
      ? Math.round((session.individual_price ?? (session.individual_price_rappen ? session.individual_price_rappen / 100 : 0)) * 100)
      : 0,
    individual_booking_requires_confirmation: session.individual_booking_requires_confirmation ?? true,
    individual_booking_confirmation_text: session.individual_booking_confirmation_text || null,
    room_id: session.room_id || courseRoomId,
    updated_at: new Date().toISOString(),
  }
}

export function classifySessionPayload(sessions: SessionPayload[]): {
  updates: Array<{ id: string; session: SessionPayload }>
  inserts: SessionPayload[]
} {
  const updates: Array<{ id: string; session: SessionPayload }> = []
  const inserts: SessionPayload[] = []
  const seen = new Set<string>()

  for (const session of sessions) {
    const rawId = session?.id
    if (rawId == null || rawId === '') {
      inserts.push(session)
      continue
    }
    const id = String(rawId)
    if (!validateUUID(id).valid) {
      rejectInvalidSession('Ungültige Session-ID')
    }
    if (seen.has(id)) {
      rejectInvalidSession('Doppelte Session-ID in der Anfrage')
    }
    seen.add(id)
    updates.push({ id, session })
  }

  return { updates, inserts }
}

/**
 * Validate that every payload session id exists in the loaded DB set for this course+tenant.
 * Hard-fails on foreign / unknown IDs (no silent insert).
 */
export function assertPayloadIdsBelongToCourse(
  updates: Array<{ id: string }>,
  existingById: Map<string, DbCourseSession>,
  courseId: string,
  tenantId: string,
): void {
  for (const { id } of updates) {
    const row = existingById.get(id)
    if (!row) {
      rejectForbidden('Session gehört nicht zu diesem Kurs oder Tenant')
    }
    if (row.course_id !== courseId || row.tenant_id !== tenantId) {
      rejectForbidden('Session gehört nicht zu diesem Kurs oder Tenant')
    }
  }
}

export function findRemovalCandidates(
  existing: DbCourseSession[],
  payloadIds: Set<string>,
): DbCourseSession[] {
  return existing.filter((row) => !payloadIds.has(row.id))
}

export type SessionRemovalBlockers = {
  customSessions: boolean
  sariMemberships: boolean
  confirmation: boolean
  activeRegistrationsOnCourse: boolean
  reasons: string[]
}

/**
 * Pure evaluation of removal blockers given preloaded dependency flags.
 * Room/vehicle bookings are cancelled before delete and are not blockers.
 */
export function evaluateRemovalBlockers(input: {
  confirmationStatus: string | null
  referencedByCustomSessions: boolean
  hasSariMembership: boolean
  courseHasActiveRegistrations: boolean
}): SessionRemovalBlockers {
  const reasons: string[] = []
  if (input.referencedByCustomSessions) {
    reasons.push('custom_sessions')
  }
  if (input.hasSariMembership) {
    reasons.push('registration_sari_memberships')
  }
  if (input.confirmationStatus != null && input.confirmationStatus !== '') {
    reasons.push('confirmation_status')
  }
  // Removing a Teil from a course that already has participants is not a product-defined safe action.
  if (input.courseHasActiveRegistrations) {
    reasons.push('course_registrations')
  }
  return {
    customSessions: input.referencedByCustomSessions,
    sariMemberships: input.hasSariMembership,
    confirmation: input.confirmationStatus != null && input.confirmationStatus !== '',
    activeRegistrationsOnCourse: input.courseHasActiveRegistrations,
    reasons,
  }
}

export function assertRemovalsAllowed(
  candidates: DbCourseSession[],
  blockerById: Map<string, SessionRemovalBlockers>,
): void {
  for (const row of candidates) {
    const blockers = blockerById.get(row.id)
    if (blockers && blockers.reasons.length > 0) {
      rejectConflict(REMOVAL_BLOCKED)
    }
  }
}

/** Detect whether a custom_sessions JSON value references a given session UUID. */
export function customSessionsReferencesSessionId(
  customSessions: unknown,
  sessionId: string,
): boolean {
  if (!customSessions || typeof customSessions !== 'object') return false
  for (const value of Object.values(customSessions as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const entry = value as Record<string, unknown>
    if (entry.sessionId != null && String(entry.sessionId) === sessionId) return true
  }
  return false
}

export async function loadCourseSessionsForReconcile(
  supabase: SupabaseClient,
  courseId: string,
  tenantId: string,
): Promise<DbCourseSession[]> {
  const { data, error } = await supabase
    .from('course_sessions')
    .select('id, course_id, tenant_id, session_number, start_time, end_time, room_id, confirmation_status')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .order('session_number', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return (data || []) as DbCourseSession[]
}

async function loadRemovalDependencyFlags(
  supabase: SupabaseClient,
  tenantId: string,
  courseId: string,
  candidates: DbCourseSession[],
): Promise<Map<string, SessionRemovalBlockers>> {
  const map = new Map<string, SessionRemovalBlockers>()
  if (candidates.length === 0) return map

  const candidateIds = candidates.map((c) => c.id)

  const { count: regCount, error: regErr } = await supabase
    .from('course_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')

  if (regErr) {
    throw createError({ statusCode: 500, statusMessage: regErr.message })
  }
  const courseHasActiveRegistrations = (regCount ?? 0) > 0

  const { data: memberships, error: memErr } = await supabase
    .from('registration_sari_memberships')
    .select('course_session_id')
    .eq('tenant_id', tenantId)
    .in('course_session_id', candidateIds)

  if (memErr) {
    throw createError({ statusCode: 500, statusMessage: memErr.message })
  }
  const membershipIds = new Set(
    (memberships || [])
      .map((m: { course_session_id?: string | null }) =>
        m.course_session_id != null ? String(m.course_session_id) : '',
      )
      .filter(Boolean),
  )

  // custom_sessions is JSON — load rows that have any custom_sessions and scan for sessionIds.
  // Scoped to tenant to avoid cross-tenant reads; a target session may live on another course.
  const { data: customRegs, error: customErr } = await supabase
    .from('course_registrations')
    .select('id, custom_sessions')
    .eq('tenant_id', tenantId)
    .not('custom_sessions', 'is', null)

  if (customErr) {
    throw createError({ statusCode: 500, statusMessage: customErr.message })
  }

  const referencedIds = new Set<string>()
  for (const reg of customRegs || []) {
    for (const sid of candidateIds) {
      if (customSessionsReferencesSessionId(reg.custom_sessions, sid)) {
        referencedIds.add(sid)
      }
    }
  }

  for (const row of candidates) {
    map.set(
      row.id,
      evaluateRemovalBlockers({
        confirmationStatus: row.confirmation_status,
        referencedByCustomSessions: referencedIds.has(row.id),
        hasSariMembership: membershipIds.has(row.id),
        courseHasActiveRegistrations,
      }),
    )
  }

  return map
}

async function cancelBookingsForSessions(
  supabase: SupabaseClient,
  tenantId: string,
  courseId: string,
  sessionIds: string[],
): Promise<void> {
  if (sessionIds.length === 0) return

  const { error: roomErr } = await supabase
    .from('room_bookings')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .in('course_session_id', sessionIds)
    .neq('status', 'cancelled')

  if (roomErr) {
    logger.warn('⚠️ Could not cancel room_bookings for removed sessions:', roomErr.message)
  }

  const { error: vehicleErr } = await supabase
    .from('vehicle_bookings')
    .update({ status: 'cancelled' })
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .in('course_session_id', sessionIds)
    .neq('status', 'cancelled')

  if (vehicleErr) {
    logger.warn('⚠️ Could not cancel vehicle_bookings for removed sessions:', vehicleErr.message)
  }
}

/**
 * Validate payload IDs and removal candidates without mutating sessions.
 * Call before updating the parent course so foreign IDs / blocked removals fail closed.
 */
export async function validateCourseSessionReconcilePlan(opts: {
  supabase: SupabaseClient
  tenantId: string
  courseId: string
  sessions: SessionPayload[]
}): Promise<{
  existing: DbCourseSession[]
  updates: Array<{ id: string; session: SessionPayload }>
  inserts: SessionPayload[]
  removalCandidates: DbCourseSession[]
}> {
  const { supabase, tenantId, courseId, sessions } = opts

  if (!validateUUID(courseId).valid || !validateUUID(tenantId).valid) {
    rejectInvalidSession()
  }

  const existing = await loadCourseSessionsForReconcile(supabase, courseId, tenantId)
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const { updates, inserts } = classifySessionPayload(sessions)
  assertPayloadIdsBelongToCourse(updates, existingById, courseId, tenantId)

  const payloadIds = new Set(updates.map((u) => u.id))
  const removalCandidates = findRemovalCandidates(existing, payloadIds)
  const blockers = await loadRemovalDependencyFlags(supabase, tenantId, courseId, removalCandidates)
  assertRemovalsAllowed(removalCandidates, blockers)

  return { existing, updates, inserts, removalCandidates }
}

/**
 * Reconcile sessions for an existing non-SARI course.
 * Returns the final session rows (id, room_id, start_time, end_time) for booking sync.
 */
export async function reconcileCourseSessions(opts: {
  supabase: SupabaseClient
  tenantId: string
  courseId: string
  sessions: SessionPayload[]
  courseRoomId: string | null
}): Promise<SavedSession[]> {
  const { supabase, tenantId, courseId, sessions, courseRoomId } = opts

  // Re-validate immediately before mutation (defense in depth).
  const { existing, updates, inserts, removalCandidates } = await validateCourseSessionReconcilePlan({
    supabase,
    tenantId,
    courseId,
    sessions,
  })
  const existingById = new Map(existing.map((row) => [row.id, row]))
  const payloadIds = new Set(updates.map((u) => u.id))

  // ── Updates (in place; preserve session_number and confirmation state) ──
  for (const { id, session } of updates) {
    const existingRow = existingById.get(id)!
    const patch = buildSessionPatch(session, courseRoomId)
    patch.description = session.description || `Session ${existingRow.session_number}`

    const { data, error } = await supabase
      .from('course_sessions')
      .update(patch)
      .eq('id', id)
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .select('id, room_id, start_time, end_time')
      .maybeSingle()

    if (error) {
      logger.error('❌ Error updating course session:', error)
      throw createError({ statusCode: 500, statusMessage: error.message })
    }
    if (!data) {
      rejectForbidden('Session gehört nicht zu diesem Kurs oder Tenant')
    }
  }

  // ── Inserts ──
  // Preserve existing session_number values; new rows get max(remaining)+1, …
  const remainingNumbers = existing
    .filter((r) => payloadIds.has(r.id))
    .map((r) => r.session_number)
  let nextNumber = remainingNumbers.length > 0 ? Math.max(...remainingNumbers) : 0

  const insertRows = inserts.map((session) => {
    nextNumber += 1
    const patch = buildSessionPatch(session, courseRoomId)
    return {
      course_id: courseId,
      tenant_id: tenantId,
      session_number: nextNumber,
      ...patch,
      description: session.description || `Session ${nextNumber}`,
    }
  })

  if (insertRows.length > 0) {
    const { error: insertErr } = await supabase
      .from('course_sessions')
      .insert(insertRows)

    if (insertErr) {
      logger.error('❌ Error inserting course sessions:', insertErr)
      throw createError({ statusCode: 500, statusMessage: insertErr.message })
    }
  }

  // ── Removals (only after validation; cancel bookings first) ──
  if (removalCandidates.length > 0) {
    const removeIds = removalCandidates.map((r) => r.id)
    await cancelBookingsForSessions(supabase, tenantId, courseId, removeIds)

    const { error: delErr } = await supabase
      .from('course_sessions')
      .delete()
      .eq('course_id', courseId)
      .eq('tenant_id', tenantId)
      .in('id', removeIds)

    if (delErr) {
      logger.error('❌ Error deleting removed course sessions:', delErr)
      throw createError({ statusCode: 500, statusMessage: delErr.message })
    }
  }

  // Reload final set for booking sync
  const { data: finalRows, error: finalErr } = await supabase
    .from('course_sessions')
    .select('id, room_id, start_time, end_time')
    .eq('course_id', courseId)
    .eq('tenant_id', tenantId)
    .order('session_number', { ascending: true })

  if (finalErr) {
    throw createError({ statusCode: 500, statusMessage: finalErr.message })
  }

  return (finalRows || []) as SavedSession[]
}

/**
 * Sync room bookings for the given sessions without deleting course_sessions.
 * Updates existing booking rows by course_session_id; inserts when missing;
 * cancels bookings for sessions that no longer need a room.
 */
export async function syncRoomBookingsForSessions(opts: {
  supabase: SupabaseClient
  tenantId: string
  courseId: string
  bookedBy: string
  requiresRoom: boolean
  sessions: SavedSession[]
}): Promise<void> {
  const { supabase, tenantId, courseId, bookedBy, requiresRoom, sessions } = opts

  const needingRoom = requiresRoom
    ? sessions.filter((s) => !!s.room_id)
    : []

  const needingIds = new Set(needingRoom.map((s) => s.id))

  // Cancel bookings for sessions on this course that no longer need a room
  const { data: existingBookings, error: listErr } = await supabase
    .from('room_bookings')
    .select('id, course_session_id, room_id, start_time, end_time, status')
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .neq('status', 'cancelled')
    .not('course_session_id', 'is', null)

  if (listErr) {
    logger.warn('⚠️ Could not list room_bookings for sync:', listErr.message)
    return
  }

  type BookingRow = {
    id: string
    course_session_id?: string | null
    room_id?: string | null
    start_time?: string
    end_time?: string
    status?: string
  }
  const bySessionId = new Map<string, BookingRow>()
  for (const b of (existingBookings || []) as BookingRow[]) {
    if (b.course_session_id) bySessionId.set(String(b.course_session_id), b)
  }

  // Cancel bookings whose session no longer needs a room (or session gone)
  const sessionIdSet = new Set(sessions.map((s) => s.id))
  for (const b of existingBookings || []) {
    const sid = b.course_session_id ? String(b.course_session_id) : null
    if (!sid) continue
    if (!sessionIdSet.has(sid) || !needingIds.has(sid)) {
      await supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('id', b.id)
        .eq('tenant_id', tenantId)
        .eq('course_id', courseId)
    }
  }

  if (needingRoom.length === 0) return

  const roomIds = [...new Set(needingRoom.map((s) => s.room_id).filter(Boolean))] as string[]
  const { data: roomData } = await supabase
    .from('rooms')
    .select('id, hourly_rate_rappen')
    .in('id', roomIds)
  const roomRates: Record<string, number> = {}
  for (const r of roomData || []) roomRates[r.id] = r.hourly_rate_rappen || 0

  // Conflict check against other courses
  const conflicts: string[] = []
  for (const s of needingRoom) {
    const { data: existing } = await supabase
      .from('room_bookings')
      .select('id, start_time')
      .eq('room_id', s.room_id)
      .neq('status', 'cancelled')
      .neq('course_id', courseId)
      .lt('start_time', s.end_time)
      .gt('end_time', s.start_time)

    if (existing && existing.length > 0) conflicts.push(s.start_time)
  }

  if (conflicts.length > 0) {
    const conflictDates = conflicts
      .map((dt) =>
        new Date(dt).toLocaleDateString('de-CH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      )
      .join(', ')
    throw createError({
      statusCode: 409,
      statusMessage: `Raumkonflikt: Der Raum ist bereits zu folgenden Zeiten gebucht: ${conflictDates}`,
    })
  }

  for (const s of needingRoom) {
    const durationMs = new Date(s.end_time).getTime() - new Date(s.start_time).getTime()
    const durationHours = durationMs / 3_600_000
    const rate = roomRates[s.room_id as string] || 0
    const cost = Math.round(rate * durationHours)
    const existing = bySessionId.get(s.id)

    if (existing && needingIds.has(s.id)) {
      const { error: updErr } = await supabase
        .from('room_bookings')
        .update({
          room_id: s.room_id,
          start_time: s.start_time,
          end_time: s.end_time,
          room_cost_rappen: cost,
          status: 'confirmed',
        })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId)
        .eq('course_id', courseId)
        .eq('course_session_id', s.id)

      if (updErr) {
        logger.error('❌ Error updating room_booking:', updErr)
        logger.warn('⚠️ Course sessions saved but room booking update failed')
      }
    } else {
      const { error: insErr } = await supabase.from('room_bookings').insert({
        room_id: s.room_id,
        tenant_id: tenantId,
        course_id: courseId,
        course_session_id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        purpose: 'course',
        booked_by: bookedBy,
        status: 'confirmed',
        room_cost_rappen: cost,
      })

      if (insErr) {
        logger.error('❌ Error creating room_booking:', insErr)
        logger.warn('⚠️ Course sessions saved but room booking insert failed')
      }
    }
  }
}
