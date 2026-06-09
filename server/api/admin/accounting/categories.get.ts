import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('accounting_categories')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('type')
    .order('name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data: data ?? [] }
})
