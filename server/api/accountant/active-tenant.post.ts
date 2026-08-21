import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { findActiveAccountantGrant } from '~/server/utils/accountant-access'
import { validateUUID } from '~/server/utils/validators'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  const role = authUser?.role || authUser?.profile?.role || ''
  if (!authUser || role !== 'accountant') {
    throw createError({ statusCode: 403, statusMessage: 'Nur Treuhänder können den Mandanten wechseln' })
  }
  const body = await readBody(event)
  const tenantId = String(body?.tenant_id || '')
  if (!validateUUID(tenantId).valid) {
    throw createError({ statusCode: 400, statusMessage: 'Ungültiger Mandant' })
  }
  const dbUserId = authUser.db_user_id || authUser.profile?.id
  const email = authUser.profile?.email || authUser.email
  const grants = await findActiveAccountantGrant({ userId: dbUserId, email, tenantId })
  if (!grants.some(g => g.tenant_id === tenantId)) {
    throw createError({ statusCode: 403, statusMessage: 'Kein Zugang zu diesem Mandanten' })
  }
  const { error } = await getSupabaseAdmin()
    .from('users')
    .update({ tenant_id: tenantId })
    .eq('id', dbUserId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, tenant_id: tenantId }
})
