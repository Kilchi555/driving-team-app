import { createError, type H3Event } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import {
  accountantCanWrite,
  normalizeAccountantEmail,
  type AccountantAccess,
} from '~/server/utils/accountant'

const STAFF_ADMIN_ROLES = ['admin', 'staff', 'super_admin', 'tenant_admin']

export type AccountingProfile = {
  id: string
  tenant_id: string
  role: string
  email: string
  auth_user_id: string
  accountant_access: AccountantAccess
  is_accountant: boolean
}

export async function findActiveAccountantGrant(params: {
  userId?: string | null
  email?: string | null
  tenantId?: string | null
}) {
  const supabase = getSupabaseAdmin()
  const email = normalizeAccountantEmail(params.email)
  const rows: Array<{ id: string; tenant_id: string; email: string; user_id: string | null; access: string; accepted_at: string | null }> = []

  if (!params.userId && !email) return []

  if (params.userId) {
    const { data, error } = await supabase
      .from('accountant_grants')
      .select('id, tenant_id, email, user_id, access, accepted_at')
      .is('revoked_at', null)
      .eq('user_id', params.userId)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
  }
  if (email) {
    const { data, error } = await supabase
      .from('accountant_grants')
      .select('id, tenant_id, email, user_id, access, accepted_at')
      .is('revoked_at', null)
      .eq('email', email)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (!rows.some(r => r.id === row.id)) rows.push(row)
    }
  }
  if (params.tenantId) {
    const match = rows.filter(g => g.tenant_id === params.tenantId)
    if (match.length) return match
  }
  return rows
}

export async function requireAccountingAccess(
  event: H3Event,
  opts: { write?: boolean } = {},
): Promise<AccountingProfile> {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const role: string = authUser.role || authUser.profile?.role || ''
  const tenantId: string = authUser.tenant_id || authUser.profile?.tenant_id || ''
  const dbUserId: string = authUser.db_user_id || authUser.profile?.id || ''
  const email = (authUser.profile?.email || authUser.email || '') as string

  if (STAFF_ADMIN_ROLES.includes(role)) {
    if (!tenantId) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – no tenant assigned' })
    }
    return {
      id: dbUserId,
      tenant_id: tenantId,
      role,
      email,
      auth_user_id: authUser.id as string,
      accountant_access: 'write',
      is_accountant: false,
    }
  }

  if (role !== 'accountant') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – insufficient role' })
  }

  const grants = await findActiveAccountantGrant({ userId: dbUserId, email, tenantId })
  const grant = grants.find(g => g.tenant_id === tenantId) ?? grants[0]
  if (!grant) {
    throw createError({ statusCode: 403, statusMessage: 'Kein Treuhänder-Zugang für diesen Mandanten' })
  }
  if (opts.write && !accountantCanWrite(grant.access)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Nur Lesezugriff. Der Admin hat keine Schreibrechte erteilt.',
    })
  }

  if (dbUserId && grant.user_id !== dbUserId) {
    await getSupabaseAdmin()
      .from('accountant_grants')
      .update({ user_id: dbUserId, accepted_at: grant.accepted_at ?? new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', grant.id)
  }

  return {
    id: dbUserId,
    tenant_id: grant.tenant_id,
    role,
    email,
    auth_user_id: authUser.id as string,
    accountant_access: grant.access as AccountantAccess,
    is_accountant: true,
  }
}
