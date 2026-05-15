import { defineEventHandler, readBody, createError } from 'h3'
import { requireAdminProfile } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Body: { user_id: string, can_accept_cash: boolean }
export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const supabase = getSupabaseAdmin()

  const body = await readBody(event)
  const { user_id, can_accept_cash } = body

  if (!user_id || typeof can_accept_cash !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'user_id and can_accept_cash are required' })
  }

  // Verify the target user belongs to the same tenant
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', user_id)
    .single()

  if (fetchError || !targetUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  if (targetUser.tenant_id !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – user belongs to a different tenant' })
  }

  const { error } = await supabase
    .from('users')
    .update({ can_accept_cash })
    .eq('id', user_id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
