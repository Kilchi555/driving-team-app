import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  // Must be admin
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, tenant_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (profileError || !profile) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!['admin', 'super_admin'].includes(profile.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  const { key, value, metadata } = await readBody(event)
  if (!key || typeof value !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'key and value are required' })
  }

  // Build the setting_value JSON — preserve existing metadata if available
  let settingValue: string
  if (metadata) {
    settingValue = JSON.stringify({ ...metadata, enabled: value })
  } else {
    // Load existing metadata to preserve displayName/description/etc.
    const { data: existing } = await supabase
      .from('tenant_settings')
      .select('setting_value')
      .eq('tenant_id', profile.tenant_id)
      .eq('category', 'features')
      .eq('setting_key', key)
      .single()

    if (existing?.setting_value) {
      try {
        const parsed = JSON.parse(existing.setting_value)
        settingValue = JSON.stringify({ ...parsed, enabled: value })
      } catch {
        settingValue = JSON.stringify({ enabled: value })
      }
    } else {
      settingValue = JSON.stringify({ enabled: value })
    }
  }

  const { error } = await supabase
    .from('tenant_settings')
    .upsert({
      tenant_id: profile.tenant_id,
      category: 'features',
      setting_key: key,
      setting_value: settingValue,
      setting_type: 'json'
    }, { onConflict: 'tenant_id,category,setting_key' })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, key, enabled: value }
})
