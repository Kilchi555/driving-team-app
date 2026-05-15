import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('medical_certificate_reviews')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('medical_certificate_uploaded_at', { ascending: false, nullsLast: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data || []
})
