import { defineEventHandler, createError, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.tenant_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const body = await readBody(event)
  const { id, action, ...packageData } = body

  const supabase = getSupabaseAdmin()

  // DELETE
  if (action === 'delete' && id) {
    const { error } = await supabase
      .from('lesson_packages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', authUser.tenant_id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true }
  }

  // UPDATE
  if (action === 'update' && id) {
    const { data, error } = await supabase
      .from('lesson_packages')
      .update({ ...packageData, tenant_id: authUser.tenant_id })
      .eq('id', id)
      .eq('tenant_id', authUser.tenant_id)
      .select()
      .single()
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
    return { success: true, package: data }
  }

  // CREATE
  const { data, error } = await supabase
    .from('lesson_packages')
    .insert({ ...packageData, tenant_id: authUser.tenant_id })
    .select()
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true, package: data }
})
