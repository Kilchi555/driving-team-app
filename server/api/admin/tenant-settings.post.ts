import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Upserts one or multiple tenant_settings rows for the authenticated tenant.
// Body can be a single setting object or an array of them.
// Each object: { category: string, setting_key: string, setting_value: any, setting_type?: string }
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody(event)
  const items: Array<{
    category: string
    setting_key: string
    setting_value: any
    setting_type?: string
  }> = Array.isArray(body) ? body : [body]

  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'No settings provided' })

  const rows = items.map(item => ({
    tenant_id: profile.tenant_id,
    category: item.category,
    setting_key: item.setting_key,
    setting_value: item.setting_value,
    setting_type: item.setting_type ?? 'string',
    updated_at: new Date().toISOString()
  }))

  const { error } = await supabase
    .from('tenant_settings')
    .upsert(rows, { onConflict: 'tenant_id,category,setting_key' })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
