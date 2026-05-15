/**
 * GET /api/admin/hr-settings
 * Returns HR-relevant tenant settings:
 *   - fulltime_weekly_hours: the tenant's 100%-workload reference (default 42.5h)
 */
import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export const FULLTIME_HOURS_DEFAULT = 42.5
export const HR_CATEGORY = 'hr'
export const KEY_FULLTIME = 'fulltime_weekly_hours'

async function getAuthenticatedAdmin(event: any) {
  const supabase = getSupabaseAdmin()
  const authHeader = event.node.req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.substring(7)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  const { data } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!data?.tenant_id || data.role !== 'admin') return null
  return { user, tenantId: data.tenant_id }
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
