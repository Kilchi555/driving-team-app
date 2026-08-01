// GET /api/correspondence/[id]

import { createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireCorrespondenceStaff } from '~/server/utils/correspondence'

export default defineEventHandler(async (event) => {
  const staff = await requireCorrespondenceStaff(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('correspondence')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', staff.tenant_id)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Correspondence not found' })

  return { success: true, data }
})
