/**
 * Public course enrollment identity.
 *
 * A course customer is a `public.users` business row. This flow does not
 * create an auth user, password, login, magic link, or onboarding claim.
 *
 * New rows use role `student`. That is already the role written by cash
 * enrollment, SARI sync, and admin add-participant. Existing `client` rows
 * are reused when the email matches exactly one customer in the course
 * tenant. Their role and profile are not rewritten.
 *
 * Email is the only automatic link. Phone never attaches an existing row.
 * `limit(2)` is an ambiguity detector: two or more rows abort. It is not
 * `limit(1)` picking an arbitrary winner.
 */
import { normalizePhoneNumber } from '~/server/utils/sms'
import { escapeLikePattern } from '~/server/utils/sql-helpers'
import { normalizeEnrollmentEmail } from '~/server/utils/normalize-enrollment-email'

export const PUBLIC_COURSE_USER_ROLE = 'student' as const

const CUSTOMER_ROLES = ['client', 'student'] as const
const STAFF_ROLES = ['admin', 'staff', 'tenant_admin', 'super_admin'] as const

export type PublicCourseUserAbortReason =
  | 'staff_contact'
  | 'ambiguous_email'
  | 'phone_only'
  | 'ambiguous_phone'
  | 'unresolved_unique'
  | 'tenant_mismatch'
  | 'lookup_failed'
  | 'insert_failed'

export class PublicCourseUserAbort extends Error {
  readonly reason: PublicCourseUserAbortReason
  readonly statusCode: number

  constructor(reason: PublicCourseUserAbortReason, message: string, statusCode = 400) {
    super(message)
    this.name = 'PublicCourseUserAbort'
    this.reason = reason
    this.statusCode = statusCode
  }
}

export type ResolvePublicCourseUserInput = {
  tenantId: string
  email?: string | null
  phone?: string | null
  firstName?: string | null
  lastName?: string | null
  referredByCode?: string | null
}

export type ResolvedPublicCourseUser = {
  userId: string
  created: boolean
}

type UserRow = { id: string, role: string | null, tenant_id?: string | null }

function phoneCandidates(phone: string | null | undefined): string[] {
  const normalized = normalizePhoneNumber(phone || '')
  if (!normalized) return []
  const localFormat = normalized.replace(/^\+41/, '0')
  return [...new Set([normalized, localFormat])]
}

async function listUsers(
  supabase: any,
  opts: {
    tenantId: string
    email?: string | null
    phones?: string[]
    roles: readonly string[]
  },
): Promise<UserRow[]> {
  let query = supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('tenant_id', opts.tenantId)
    .in('role', [...opts.roles])

  if (opts.email) query = query.ilike('email', escapeLikePattern(opts.email))
  if (opts.phones?.length) query = query.in('phone', opts.phones)

  const { data, error } = await query.limit(2)
  if (error) {
    throw new PublicCourseUserAbort(
      'lookup_failed',
      'Teilnehmer konnte nicht zugeordnet werden.',
      500,
    )
  }
  const rows = (data ?? []) as UserRow[]
  if (rows.some((row) => row.tenant_id && row.tenant_id !== opts.tenantId)) {
    throw new PublicCourseUserAbort(
      'tenant_mismatch',
      'Teilnehmer gehört zu einem anderen Unternehmen.',
      409,
    )
  }
  return rows
}

async function assertUserInCourseTenant(
  supabase: any,
  userId: string,
  tenantId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error || !data || data.tenant_id !== tenantId) {
    throw new PublicCourseUserAbort(
      'tenant_mismatch',
      'Teilnehmer gehört zu einem anderen Unternehmen.',
      409,
    )
  }
}

async function reuseOrAbortEmail(
  supabase: any,
  tenantId: string,
  email: string,
): Promise<string | null> {
  const rows = await listUsers(supabase, {
    tenantId,
    email,
    roles: CUSTOMER_ROLES,
  })
  if (rows.length > 1) {
    throw new PublicCourseUserAbort(
      'ambiguous_email',
      'Diese E-Mail ist mehrfach hinterlegt und kann nicht eindeutig zugeordnet werden.',
      409,
    )
  }
  if (rows.length === 1) {
    await assertUserInCourseTenant(supabase, rows[0].id, tenantId)
    return rows[0].id
  }
  return null
}

export async function resolvePublicCourseUser(
  supabase: any,
  input: ResolvePublicCourseUserInput,
): Promise<ResolvedPublicCourseUser> {
  const tenantId = input.tenantId
  if (!tenantId) {
    throw new PublicCourseUserAbort('tenant_mismatch', 'Kursunternehmen fehlt.', 400)
  }

  const email = normalizeEnrollmentEmail(input.email)
  const phones = phoneCandidates(input.phone)

  if (email) {
    const staffByEmail = await listUsers(supabase, {
      tenantId,
      email,
      roles: STAFF_ROLES,
    })
    if (staffByEmail.length > 0) {
      throw new PublicCourseUserAbort(
        'staff_contact',
        'Diese E-Mail gehört einem Mitarbeiterkonto. Bitte die E-Mail der Kursteilnehmerin / des Kursteilnehmers verwenden.',
      )
    }
  }

  if (phones.length) {
    const staffByPhone = await listUsers(supabase, {
      tenantId,
      phones,
      roles: STAFF_ROLES,
    })
    if (staffByPhone.length > 0) {
      throw new PublicCourseUserAbort(
        'staff_contact',
        'Diese Telefonnummer gehört einem Mitarbeiterkonto. Bitte die Telefonnummer der Kursteilnehmerin / des Kursteilnehmers verwenden.',
      )
    }
  }

  if (email) {
    const existingId = await reuseOrAbortEmail(supabase, tenantId, email)
    if (existingId) return { userId: existingId, created: false }
  }

  if (phones.length) {
    const phoneRows = await listUsers(supabase, {
      tenantId,
      phones,
      roles: CUSTOMER_ROLES,
    })
    if (phoneRows.length > 1) {
      throw new PublicCourseUserAbort(
        'ambiguous_phone',
        'Diese Telefonnummer ist mehrfach hinterlegt und kann nicht eindeutig zugeordnet werden.',
        409,
      )
    }
    if (phoneRows.length === 1) {
      throw new PublicCourseUserAbort(
        'phone_only',
        'Diese Telefonnummer ist bereits einem Kunden zugeordnet. Eine Zuordnung nur über die Telefonnummer erfolgt nicht.',
        409,
      )
    }
  }

  const normalizedPhone = phones[0] ?? null
  const insertPayload: Record<string, unknown> = {
    first_name: (input.firstName || '').trim() || 'Teilnehmer',
    last_name: (input.lastName || '').trim(),
    email,
    phone: normalizedPhone,
    tenant_id: tenantId,
    role: PUBLIC_COURSE_USER_ROLE,
    is_active: true,
    auth_user_id: null,
  }
  const referral = input.referredByCode?.trim()
  if (referral) insertPayload.referred_by_code = referral

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert(insertPayload)
    .select('id, tenant_id')
    .single()

  if (created?.id) {
    if (created.tenant_id && created.tenant_id !== tenantId) {
      throw new PublicCourseUserAbort(
        'tenant_mismatch',
        'Teilnehmer gehört zu einem anderen Unternehmen.',
        409,
      )
    }
    await assertUserInCourseTenant(supabase, created.id, tenantId)
    return { userId: created.id as string, created: true }
  }

  if (insertError?.code === '23505') {
    if (email) {
      const recovered = await reuseOrAbortEmail(supabase, tenantId, email)
      if (recovered) return { userId: recovered, created: false }
    }
    throw new PublicCourseUserAbort(
      'unresolved_unique',
      'Der Teilnehmer konnte nach einem gleichzeitigen Anmeldeversuch nicht eindeutig zugeordnet werden.',
      409,
    )
  }

  throw new PublicCourseUserAbort(
    'insert_failed',
    'Teilnehmer konnte nicht angelegt werden.',
    500,
  )
}
