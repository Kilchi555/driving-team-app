import { defineEventHandler, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('examiners')
    .select(`
      *,
      exam_results (
        examiner_behavior_rating
      )
    `)
    .eq('tenant_id', profile.tenant_id)
    .order('last_name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return data || []
})
