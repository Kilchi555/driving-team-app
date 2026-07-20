import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { mapSupabaseError } from '~/server/utils/supabase-error'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  // Bearer header with HTTP-only-cookie fallback + token refresh, instead of
  // a raw Bearer-only check that would 401 whenever the client's access
  // token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const userProfile = authUser.db_user_id
    ? { id: authUser.db_user_id, tenant_id: authUser.tenant_id }
    : null

  if (!userProfile) throw createError({ statusCode: 403, message: 'User profile not found' })

  const body = await readBody(event)
  const { invoice_id } = body

  if (!invoice_id) {
    throw createError({ statusCode: 400, message: 'Missing invoice_id' })
  }

  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoice_id)
      .eq('tenant_id', userProfile.tenant_id)

    if (error) throw mapSupabaseError(error)

    return { success: true }
  } catch (err: any) {
    console.error('Error deleting invoice:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
