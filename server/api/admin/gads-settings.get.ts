import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('google_ads_customer_id')
    .eq('id', profile.tenant_id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return {
    google_ads_customer_id: tenant?.google_ads_customer_id ?? '',
    connected: !!tenant?.google_ads_customer_id,
  }
})
