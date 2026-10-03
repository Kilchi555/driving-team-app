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
