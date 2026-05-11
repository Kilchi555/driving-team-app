import { defineEventHandler, createError, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const { userId } = getQuery(event)
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('customer_packages')
    .select(`
      *,
      lesson_packages(name, lessons_count, category_code, includes_course, course_category),
      users!customer_packages_user_id_fkey(id, first_name, last_name, email)
    `)
    .eq('tenant_id', authUser.tenant_id)
    .order('purchased_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId as string)
  }

  const { data, error } = await query
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, customerPackages: data }
})
