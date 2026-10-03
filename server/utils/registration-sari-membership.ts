import { createError } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only source of truth for a registration's current SARI memberships.
 * The table has no anon/authenticated policies. Callers must use the service role.
 *
 * A row exists only after SARI has confirmed that numeric course id.
 * Deleting the row is allowed only after SARI has confirmed the seat is gone.
 * There is no state column: absence means no active membership.
 *
 * SARI and Postgres are not one transaction. A confirmed SARI call followed by
 * a failed write is returned as an error, never as a completed enrollment or
 * unenrollment.
 */

export const SARI_MEMBERSHIP_SOURCE = {
  manualEnrollment: 'MANUAL_ENROLLMENT',
  webhookEnrollment: 'WEBHOOK_ENROLLMENT',
  cashEnrollment: 'COURSE_ENROLLMENT_CASH',
  walleeEnrollment: 'COURSE_ENROLLMENT_WALLEE',
  adminCourseEnroll: 'ADMIN_COURSE_ENROLL',
  transferEnrollment: 'TRANSFER_ENROLLMENT',
  transferSession: 'ADMIN_TRANSFER_SESSION',
  syncEngine: 'SARI_SYNC_ENGINE',
  syncParticipants: 'SARI_SYNC_PARTICIPANTS',
} as const

export type SariMembershipSource = (typeof SARI_MEMBERSHIP_SOURCE)[keyof typeof SARI_MEMBERSHIP_SOURCE]

export type RegistrationSariMembership = {
  id: string
  tenant_id: string
  registration_id: string
  sari_session_id: number
  course_session_id: string | null
  source: string
}

export class SariMembershipWriteError extends Error {
  readonly code:
    | 'registration_tenant'
    | 'session_tenant'
    | 'invalid_sari_session_id'
    | 'persist_failed'
    | 'delete_failed'
    | 'membership_exists'

  constructor(code: SariMembershipWriteError['code'], message: string) {
    super(message)
    this.name = 'SariMembershipWriteError'
    this.code = code
  }
}

type MembershipDb = SupabaseClient

export function parsePositiveSariSessionId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0 && Number.isSafeInteger(value)) {
    return value
  }
  if (typeof value === 'bigint' && value > 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(value)
  }
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === '23505' || (error.message || '').toLowerCase().includes('duplicate key')
}

/** Every segment must be a positive safe integer. GROUP_ stays a catalog string, never a SARI id. */
export function strictSariIdsFromParts(parts: unknown[]): number[] {
  const ids: number[] = []
  for (const part of parts) {
    const parsed = parsePositiveSariSessionId(part)
    if (parsed != null && !ids.includes(parsed)) ids.push(parsed)
  }
  return ids
}

export function strictSariIdsFromGroup(value: unknown): number[] {
  if (typeof value !== 'string') {
    const single = parsePositiveSariSessionId(value)
    return single == null ? [] : [single]
  }
  const trimmed = value.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('GROUP_')) {
    return strictSariIdsFromParts(trimmed.slice('GROUP_'.length).split('_'))
  }
  const single = parsePositiveSariSessionId(trimmed)
  return single == null ? [] : [single]
}

export function isConfirmedSariEnrollDuplicate(message: string | undefined | null): boolean {
  const text = message || ''
  return text.includes('ALREADY_ENROLLED') || text.includes('PERSON_ALREADY_ADDED')
}

export function normalizeFaberid(value: unknown): string {
  return String(value || '').replace(/\./g, '').trim()
}

/** Same tenant, same course, same Faber-ID, confirmed, and not a reserved seat. */
export function isSameConfirmedEnrollment(
  row: {
    tenant_id?: unknown
    course_id?: unknown
    sari_faberid?: unknown
    status?: unknown
    payment_method?: unknown
  },
  expected: { tenantId: string; courseId: string; faberid: unknown },
): boolean {
  const faberid = normalizeFaberid(expected.faberid)
  return row.tenant_id === expected.tenantId
    && row.course_id === expected.courseId
    && faberid.length > 0
    && normalizeFaberid(row.sari_faberid) === faberid
    && row.status === 'confirmed'
    && row.payment_method !== 'reserved'
}

export async function persistConfirmedEnrollmentSnapshots(args: {
  supabase: MembershipDb
  tenantId: string
  registrationId: string
  sessions: Array<{ sariSessionId: number; courseSessionId: string | null }>
  source: string
  markSynced: boolean
}): Promise<void> {
  for (const session of args.sessions) {
    await recordConfirmedSariMembershipWithRetry({
      supabase: args.supabase,
      tenantId: args.tenantId,
      registrationId: args.registrationId,
      sariSessionId: session.sariSessionId,
      courseSessionId: session.courseSessionId,
      source: args.source,
    })
  }
  if (!args.markSynced || args.sessions.length === 0) return
  const rows = await listRegistrationSariMemberships(args.supabase, args.tenantId, args.registrationId)
  const have = new Set(rows.map((row) => row.sari_session_id))
  if (args.sessions.every((session) => have.has(session.sariSessionId))) {
    await setRegistrationSariSynced(args.supabase, args.tenantId, args.registrationId, true)
  }
}

/**
 * Repair snapshots on one existing registration after SARI confirms the same ids.
 * Ids that already have a row are not sent to SARI again. Always ends by throwing
 * the duplicate response, or a hard failure when the snapshot is still incomplete.
 */
export async function resumeExistingConfirmedEnrollment(args: {
  supabase: MembershipDb
  sari: { enrollStudent: (courseId: number, faberid: string, birthdate: string) => Promise<void> }
  tenantId: string
  courseId: string
  registration: {
    id: string
    tenant_id?: unknown
    course_id?: unknown
    sari_faberid?: unknown
    status?: unknown
    payment_method?: unknown
  }
  faberid: string
  birthdate: string
  sessions: Array<{ sariSessionId: number; courseSessionId: string | null }>
  source: string
  duplicateStatusMessage: string
}): Promise<never> {
  if (!isSameConfirmedEnrollment(args.registration, {
    tenantId: args.tenantId,
    courseId: args.courseId,
    faberid: args.faberid,
  })) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Die bestehende Anmeldung gehört nicht zu diesem Kurs.',
    })
  }

  if (args.sessions.length === 0) {
    throw createError({ statusCode: 409, statusMessage: args.duplicateStatusMessage })
  }

  const memberships = await listRegistrationSariMemberships(
    args.supabase,
    args.tenantId,
    args.registration.id,
  )
  const have = new Set(memberships.map((row) => row.sari_session_id))
  const missing = args.sessions.filter((session) => !have.has(session.sariSessionId))

  if (missing.length === 0) {
    await setRegistrationSariSynced(args.supabase, args.tenantId, args.registration.id, true)
    throw createError({ statusCode: 409, statusMessage: args.duplicateStatusMessage })
  }

  const confirmed: Array<{ sariSessionId: number; courseSessionId: string | null }> = []
  for (const session of missing) {
    try {
      await args.sari.enrollStudent(session.sariSessionId, args.faberid, args.birthdate)
      confirmed.push(session)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (isConfirmedSariEnrollDuplicate(message)) confirmed.push(session)
    }
  }

  try {
    await persistConfirmedEnrollmentSnapshots({
      supabase: args.supabase,
      tenantId: args.tenantId,
      registrationId: args.registration.id,
      sessions: confirmed,
      source: args.source,
      markSynced: false,
    })
  } catch {
    throw createError({
      statusCode: 500,
      statusMessage: 'SARI enrollment succeeded, but the membership could not be saved',
    })
  }

  const after = await listRegistrationSariMemberships(args.supabase, args.tenantId, args.registration.id)
  const afterIds = new Set(after.map((row) => row.sari_session_id))
  const complete = args.sessions.every((session) => afterIds.has(session.sariSessionId))
  if (!complete) {
    throw createError({
      statusCode: 500,
      statusMessage: 'SARI enrollment succeeded, but the membership could not be saved',
    })
  }
  await setRegistrationSariSynced(args.supabase, args.tenantId, args.registration.id, true)
  throw createError({ statusCode: 409, statusMessage: args.duplicateStatusMessage })
}

/**
 * SARI-managed + faberid + confirmed + not reserved + no snapshot.
 * That state is unknown, not "unenrolled".
 */
export function isUnresolvedSariRegistration(args: {
  sariManaged: boolean
  faberid: unknown
  status: unknown
  paymentMethod: unknown
  membershipCount: number
}): boolean {
  const faberid = String(args.faberid || '').trim()
  return Boolean(args.sariManaged)
    && faberid.length > 0
    && args.status === 'confirmed'
    && args.paymentMethod !== 'reserved'
    && args.membershipCount === 0
}

export function uniqueLocalCourseSessionId(
  sessions: Array<{ id?: string | null; sari_session_id?: unknown; tenant_id?: string | null }> | null | undefined,
  sariSessionId: number,
  tenantId?: string,
): string | null {
  const matches = (sessions || []).filter((row) => {
    if (tenantId && row.tenant_id && row.tenant_id !== tenantId) return false
    return parsePositiveSariSessionId(row.sari_session_id) === sariSessionId && Boolean(row.id)
  })
  return matches.length === 1 ? matches[0].id || null : null
}

export async function uniqueCourseSessionIdForSari(
  supabase: MembershipDb,
  tenantId: string,
  courseId: string,
  sariSessionId: number,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('course_sessions')
    .select('id, tenant_id, sari_session_id')
    .eq('tenant_id', tenantId)
    .eq('course_id', courseId)
    .eq('sari_session_id', String(sariSessionId))

  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
  return uniqueLocalCourseSessionId(data || [], sariSessionId, tenantId)
}

export async function setRegistrationSariSynced(
  supabase: MembershipDb,
  tenantId: string,
  registrationId: string,
  synced: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('course_registrations')
    .update({
      sari_synced: synced,
      sari_synced_at: synced ? new Date().toISOString() : null,
    })
    .eq('id', registrationId)
    .eq('tenant_id', tenantId)
  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
}

export async function recordConfirmedSariMembershipWithRetry(
  args: Parameters<typeof recordConfirmedSariMembership>[0],
  attempts = 3,
): Promise<{ created: boolean }> {
  let last: unknown
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await recordConfirmedSariMembership(args)
    } catch (error) {
      last = error
      if (!(error instanceof SariMembershipWriteError) || error.code !== 'persist_failed' || attempt === attempts) {
        throw error
      }
    }
  }
  throw last
}

export async function recordConfirmedSariMembership(args: {
  supabase: MembershipDb
  tenantId: string
  registrationId: string
  sariSessionId: unknown
  courseSessionId?: string | null
  source: string
}): Promise<{ created: boolean }> {
  const sariSessionId = parsePositiveSariSessionId(args.sariSessionId)
  if (sariSessionId == null) {
    throw new SariMembershipWriteError('invalid_sari_session_id', 'SARI session id must be a positive integer')
  }
  if (!args.tenantId || !args.registrationId || !args.source) {
    throw new SariMembershipWriteError('persist_failed', 'tenant, registration, and source are required')
  }

  const { data: registration, error: registrationError } = await args.supabase
    .from('course_registrations')
    .select('id, tenant_id')
    .eq('id', args.registrationId)
    .eq('tenant_id', args.tenantId)
    .maybeSingle()

  if (registrationError) {
    throw new SariMembershipWriteError('persist_failed', registrationError.message)
  }
  if (!registration || registration.tenant_id !== args.tenantId) {
    throw new SariMembershipWriteError('registration_tenant', 'Registration does not belong to the verified tenant')
  }

  const courseSessionId = args.courseSessionId || null
  if (courseSessionId) {
    const { data: session, error: sessionError } = await args.supabase
      .from('course_sessions')
      .select('id, tenant_id')
      .eq('id', courseSessionId)
      .eq('tenant_id', registration.tenant_id)
      .maybeSingle()
    if (sessionError) {
      throw new SariMembershipWriteError('persist_failed', sessionError.message)
    }
    if (!session || session.tenant_id !== registration.tenant_id) {
      throw new SariMembershipWriteError('session_tenant', 'Course session does not belong to the registration tenant')
    }
  }

  const { error } = await args.supabase.from('registration_sari_memberships').insert({
    tenant_id: registration.tenant_id,
    registration_id: registration.id,
    sari_session_id: sariSessionId,
    course_session_id: courseSessionId,
    source: args.source,
  })

  if (isUniqueViolation(error)) return { created: false }
  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
  return { created: true }
}

export async function listRegistrationSariMemberships(
  supabase: MembershipDb,
  tenantId: string,
  registrationId: string,
): Promise<RegistrationSariMembership[]> {
  const { data, error } = await supabase
    .from('registration_sari_memberships')
    .select('id, tenant_id, registration_id, sari_session_id, course_session_id, source')
    .eq('tenant_id', tenantId)
    .eq('registration_id', registrationId)
    .order('sari_session_id', { ascending: true })

  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
  return (data || []).map(normalizeMembership)
}

export async function listStudentMembershipsForCourseSession(
  supabase: MembershipDb,
  tenantId: string,
  courseSessionId: string,
  studentId: string,
): Promise<RegistrationSariMembership[]> {
  const { data, error } = await supabase
    .from('registration_sari_memberships')
    .select('id, tenant_id, registration_id, sari_session_id, course_session_id, source')
    .eq('tenant_id', tenantId)
    .eq('course_session_id', courseSessionId)
    .order('sari_session_id', { ascending: true })

  if (error) throw new SariMembershipWriteError('persist_failed', error.message)

  const owned: RegistrationSariMembership[] = []
  for (const row of data || []) {
    const membership = normalizeMembership(row)
    const { data: registration, error: registrationError } = await supabase
      .from('course_registrations')
      .select('id, user_id, tenant_id')
      .eq('id', membership.registration_id)
      .eq('tenant_id', tenantId)
      .eq('user_id', studentId)
      .maybeSingle()
    if (registrationError) throw new SariMembershipWriteError('persist_failed', registrationError.message)
    if (registration?.user_id === studentId && registration.tenant_id === tenantId) {
      owned.push(membership)
    }
  }
  return owned
}

export async function deleteConfirmedSariMembership(args: {
  supabase: MembershipDb
  tenantId: string
  registrationId: string
  sariSessionId: number
}): Promise<void> {
  const sariSessionId = parsePositiveSariSessionId(args.sariSessionId)
  if (sariSessionId == null) {
    throw new SariMembershipWriteError('invalid_sari_session_id', 'SARI session id must be a positive integer')
  }
  const { error } = await args.supabase
    .from('registration_sari_memberships')
    .delete()
    .eq('tenant_id', args.tenantId)
    .eq('registration_id', args.registrationId)
    .eq('sari_session_id', sariSessionId)

  if (error) throw new SariMembershipWriteError('delete_failed', error.message)
}

export async function assertRegistrationsDeletable(
  supabase: MembershipDb,
  registrationIds: string[],
): Promise<void> {
  const ids = registrationIds.filter(Boolean)
  if (ids.length === 0) return
  const { data, error } = await supabase
    .from('registration_sari_memberships')
    .select('registration_id')
    .in('registration_id', ids)
    .limit(1)

  if (error) throw new SariMembershipWriteError('persist_failed', error.message)
  if (data && data.length > 0) {
    throw new SariMembershipWriteError(
      'membership_exists',
      'Registration cannot be deleted while a SARI membership exists',
    )
  }
}

function normalizeMembership(row: {
  id: string
  tenant_id: string
  registration_id: string
  sari_session_id: number | string
  course_session_id: string | null
  source: string
}): RegistrationSariMembership {
  const sariSessionId = parsePositiveSariSessionId(row.sari_session_id)
  if (sariSessionId == null) {
    throw new SariMembershipWriteError('invalid_sari_session_id', 'Stored SARI session id is not a positive integer')
  }
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    registration_id: row.registration_id,
    sari_session_id: sariSessionId,
    course_session_id: row.course_session_id,
    source: row.source,
  }
}
