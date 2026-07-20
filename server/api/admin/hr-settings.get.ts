/**
 * GET /api/admin/hr-settings
 * Returns HR-relevant tenant settings:
 *   - fulltime_weekly_hours: the tenant's 100%-workload reference (default 42.5h)
 */
import { defineEventHandler, createError } from 'h3'
import type { H3Event } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export const FULLTIME_HOURS_DEFAULT = 42.5
export const HR_CATEGORY = 'hr'
export const KEY_FULLTIME = 'fulltime_weekly_hours'

// Bearer header with HTTP-only-cookie fallback + token refresh, instead of a
// raw Bearer-only check that would 401 whenever the client's access token
// had just expired.
export async function getAuthenticatedAdmin(event: H3Event) {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.db_user_id || !authUser.tenant_id || authUser.role !== 'admin') return null
  return { user: authUser, tenantId: authUser.tenant_id }
}

export default defineEventHandler(async (event) => {
  const auth = await getAuthenticatedAdmin(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('tenant_settings')
    .select('setting_value')
    .eq('tenant_id', auth.tenantId)
    .eq('category', HR_CATEGORY)
    .eq('setting_key', KEY_FULLTIME)
    .maybeSingle()

  return {
    fulltime_weekly_hours: data?.setting_value
      ? parseFloat(data.setting_value)
      : FULLTIME_HOURS_DEFAULT,
  }
})
