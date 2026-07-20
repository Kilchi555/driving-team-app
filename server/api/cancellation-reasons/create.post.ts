import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id, role: authUser.role }
    : null

  if (!userProfile || userProfile.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Only admins can create' })
  }

  const body = await readBody(event)
  const { code, name_de, description_de, is_active, sort_order, cancellation_type } = body

  const { data, error } = await supabase
    .from('cancellation_reasons')
    .insert({
      code,
      name_de,
      description_de,
      is_active,
      sort_order,
      cancellation_type,
      tenant_id: userProfile.tenant_id
    })
    .select()
    .single()

  if (error) {
    logger.error('❌ DB error creating cancellation reason:', error)
    if (error.code === '23505') {
      throw createError({
        statusCode: 409,
        message: `Ein Absage-Grund mit dem Code "${code}" existiert für diesen Mandanten bereits.`,
        data: { code: '23505' }
      })
    }
    throw createError({ statusCode: 500, message: 'Failed to create', data: { code: error.code } })
  }

  return { success: true, data }
})
