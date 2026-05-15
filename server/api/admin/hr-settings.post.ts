/**
 * POST /api/admin/hr-settings
 * Saves HR-relevant tenant settings.
 * Body: { fulltime_weekly_hours: number }
 */
import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { HR_CATEGORY, KEY_FULLTIME } from './hr-settings.get'

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

  const body = await readBody(event)
  const fulltime_weekly_hours = parseFloat(body.fulltime_weekly_hours)
  if (isNaN(fulltime_weekly_hours) || fulltime_weekly_hours <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'fulltime_weekly_hours must be a positive number' })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('tenant_settings')
    .upsert(
      {
        tenant_id: auth.tenantId,
        category: HR_CATEGORY,
        setting_key: KEY_FULLTIME,
        setting_value: String(fulltime_weekly_hours),
        setting_type: 'number',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,category,setting_key' }
    )

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, fulltime_weekly_hours }
})
