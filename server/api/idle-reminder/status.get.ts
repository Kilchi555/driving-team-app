import { getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { verifyIdleStopToken } from '~/server/utils/idle-stop-token'

async function resolveClientId(event: any): Promise<string | null> {
  const query = getQuery(event)
  const token = typeof query.t === 'string' ? query.t : null
  const fromToken = verifyIdleStopToken(token)
  if (fromToken) return fromToken

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .eq('role', 'client')
    .is('deleted_at', null)
    .maybeSingle()

  return data?.id || null
}

export default defineEventHandler(async (event) => {
  const userId = await resolveClientId(event)
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Ungültiger Link' })
  }

  const supabase = getSupabaseAdmin()
  const { data: student, error } = await supabase
    .from('users')
    .select('id, first_name, role, tenant_id, no_further_lessons_at, no_further_lessons_reason')
    .eq('id', userId)
    .eq('role', 'client')
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !student) {
    throw createError({ statusCode: 404, statusMessage: 'Nicht gefunden' })
  }

  let tenantName = 'Fahrschule'
  if (student.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', student.tenant_id)
      .maybeSingle()
    if (tenant?.name) tenantName = tenant.name
  }

  return {
    success: true,
    firstName: student.first_name || '',
    tenantName,
    stopped: !!student.no_further_lessons_at,
    reason: student.no_further_lessons_reason || null
  }
})
