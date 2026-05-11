import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('lesson_packages')
    .select('*')
    .eq('tenant_id', authUser.tenant_id)
    .order('sort_order')
    .order('created_at')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, packages: data }
})
