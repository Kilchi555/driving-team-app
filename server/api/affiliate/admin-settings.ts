import { defineEventHandler, getHeader, createError, readBody } from 'h3'
import { getSupabase } from '~/utils/supabase'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

async function getAdminUser(event: any) {
  const supabase = getSupabase()
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabaseAdmin = getSupabaseAdmin()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  return profile
}

/**
 * GET  /api/affiliate/admin-settings  → read settings
 * PUT  /api/affiliate/admin-settings  → update settings
 */
export default defineEventHandler(async (event) => {
  const admin = await getAdminUser(event)
  const supabaseAdmin = getSupabaseAdmin()

  if (event.method === 'GET') {
    const { data: rows } = await supabaseAdmin
      .from('tenant_settings')
      .select('setting_key, setting_value')
      .eq('tenant_id', admin.tenant_id)
      .eq('category', 'affiliate')

    const settings: Record<string, any> = {}
    for (const row of rows ?? []) {
      settings[row.setting_key] = row.setting_value
    }

    return {
      success: true,
      data: {
        reward_rappen: parseInt(settings['reward_rappen'] ?? '5000', 10),
        enabled: settings['enabled'] !== 'false',
      }
    }
  }

  if (event.method === 'PUT') {
    const body = await readBody(event)
    const { reward_rappen, enabled } = body

    if (reward_rappen !== undefined) {
      await supabaseAdmin.from('tenant_settings').upsert({
        tenant_id: admin.tenant_id,
        category: 'affiliate',
        setting_key: 'reward_rappen',
        setting_value: String(Math.max(0, parseInt(reward_rappen, 10))),
        setting_type: 'number',
        updated_by: admin.id,
      }, { onConflict: 'tenant_id,category,setting_key' })
    }

    if (enabled !== undefined) {
      await supabaseAdmin.from('tenant_settings').upsert({
        tenant_id: admin.tenant_id,
        category: 'affiliate',
        setting_key: 'enabled',
        setting_value: enabled ? 'true' : 'false',
        setting_type: 'boolean',
        updated_by: admin.id,
      }, { onConflict: 'tenant_id,category,setting_key' })
    }

    return { success: true }
  }

  throw createError({ statusCode: 405, message: 'Method not allowed' })
})
