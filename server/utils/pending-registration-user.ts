type DbError = { code?: string | number; message?: string } | null

export type PendingUserProfile = Record<string, unknown>

export type PendingRegistrationWrite =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; conflict: 'email' | 'phone' }

/**
 * "Neuer Benutzer" and the one-time "Anmeldung erhalten" receipt.
 * Both describe the first creation of the pending user, not a later update
 * and not a new inquiry. The school-facing inquiry mail is separate.
 */
export function pendingUserNotificationPlan(created: boolean): {
  notifyAdminNewUser: boolean
  sendCustomerRegistrationReceipt: boolean
} {
  return {
    notifyAdminNewUser: created,
    sendCustomerRegistrationReceipt: created,
  }
}

type UserRow = {
  id: string
  onboarding_status?: string | null
  auth_user_id?: string | null
}

type UserFilter = {
  eq: (column: string, value: string) => UserFilter
  maybeSingle: () => Promise<{ data: UserRow | null; error: DbError }>
}

type UserQuery = {
  select: (columns?: string) => UserFilter
  update: (payload: PendingUserProfile) => {
    eq: (column: string, value: string) => Promise<{ error: DbError }>
  }
  insert: (payload: PendingUserProfile & { id: string }) => Promise<{ error: DbError }>
}

export type PendingUserAdmin = {
  from: (table: 'users') => UserQuery
}

function isUniqueViolation(error: DbError): boolean {
  return String(error?.code || '') === '23505'
}

function isActiveAccount(row: UserRow | null): boolean {
  if (!row) return false
  return Boolean(row.auth_user_id) || row.onboarding_status === 'completed'
}

async function findUser(
  admin: PendingUserAdmin,
  tenantId: string,
  column: 'email' | 'phone',
  value: string,
  pendingOnly: boolean,
): Promise<UserRow | null> {
  let query = admin
    .from('users')
    .select('id, onboarding_status, auth_user_id')
    .eq(column, value)
    .eq('tenant_id', tenantId)
  if (pendingOnly) query = query.eq('onboarding_status', 'pending')
  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

/**
 * Update an existing pending user, or insert one.
 * `created` is true only when this call's INSERT succeeded.
 * A unique-violation from a parallel insert is an update outcome: no second
 * "Neuer Benutzer" mail. The database unique indexes on (email, tenant_id)
 * and (phone, tenant_id) decide the race, not a prior SELECT.
 */
export async function upsertPendingRegistrationUser(
  admin: PendingUserAdmin,
  input: {
    tenantId: string
    email: string | null
    phone: string | null
    profile: PendingUserProfile
    newUserId: string
  },
): Promise<PendingRegistrationWrite> {
  const { tenantId, email, phone, profile, newUserId } = input

  let existingId: string | null = null
  if (email) {
    existingId = (await findUser(admin, tenantId, 'email', email, true))?.id ?? null
  }
  if (!existingId && phone) {
    existingId = (await findUser(admin, tenantId, 'phone', phone, true))?.id ?? null
  }

  if (existingId) {
    const { error } = await admin.from('users').update(profile).eq('id', existingId)
    if (error) throw error
    return { ok: true, userId: existingId, created: false }
  }

  const { error: insertError } = await admin.from('users').insert({ id: newUserId, ...profile })
  if (!insertError) {
    return { ok: true, userId: newUserId, created: true }
  }
  if (!isUniqueViolation(insertError)) throw insertError

  const emailRow = email ? await findUser(admin, tenantId, 'email', email, false) : null
  if (emailRow) {
    if (isActiveAccount(emailRow)) return { ok: false, conflict: 'email' }
    return { ok: true, userId: emailRow.id, created: false }
  }
  const phoneRow = phone ? await findUser(admin, tenantId, 'phone', phone, false) : null
  if (phoneRow) {
    if (isActiveAccount(phoneRow)) return { ok: false, conflict: 'phone' }
    return { ok: true, userId: phoneRow.id, created: false }
  }

  throw insertError
}
