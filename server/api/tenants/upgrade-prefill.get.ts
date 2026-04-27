import { defineEventHandler, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

/**
 * Returns pre-fill data for the upgrade page:
 * - staffList: active staff with id/name (to let user pick who to deactivate)
 * - hasCourseSessions: whether tenant already uses course sessions
 * - hasAffiliateCodes: whether tenant already uses affiliate codes
 */
export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) {
    throw createError({ statusCode: 401, statusMessage: 'Nicht authentifiziert' })
  }

  const supabase = getSupabaseAdmin()
  const tenantId = authUser.tenant_id

  const [staffRes, coursesRes, affiliateRes] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, role, email')
      .eq('tenant_id', tenantId)
      .in('role', ['staff', 'admin'])
      .order('role', { ascending: false }) // admins first
      .order('first_name'),

    supabase
      .from('course_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .limit(1),

    supabase
      .from('affiliate_codes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .limit(1),
  ])

  const staffList = (staffRes.data || []).map(u => ({
    id: u.id,
    name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
    role: u.role,
  }))

  return {
    activeStaffCount: staffList.length,
    staffList,
    hasCourseSessions: (coursesRes.count ?? 0) > 0,
    hasAffiliateCodes: (affiliateRes.count ?? 0) > 0,
  }
})
