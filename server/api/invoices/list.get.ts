import { defineEventHandler, getQuery, createError } from 'h3'
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

  const query = getQuery(event)
  const { page = '1', limit = '20', status, payment_status, user_id, search, has_dunning } = query

  const pageNum = parseInt(page as string) || 1
  const limitNum = Math.min(parseInt(limit as string) || 20, 100)
  const from = (pageNum - 1) * limitNum
  const to = from + limitNum - 1

  try {
    let q = supabase
      .from('invoices_with_details')
      .select('*', { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)

    if (status) {
      const statuses = (status as string).split(',')
      q = q.in('status', statuses)
    }

    if (payment_status) {
      const paymentStatuses = (payment_status as string).split(',')
      q = q.in('payment_status', paymentStatuses)
    }

    if (user_id) {
      q = q.eq('user_id', user_id as string)
    }

    if (has_dunning === '1' || has_dunning === 'true') {
      q = q.gt('dunning_level', 0)
    }

    if (search) {
      const searchTerm = search as string
      q = q.or(`invoice_number.ilike.%${searchTerm}%,customer_first_name.ilike.%${searchTerm}%,customer_last_name.ilike.%${searchTerm}%`)
    }

    q = q.order('created_at', { ascending: false }).range(from, to)

    const { data, count, error } = await q

    if (error) throw mapSupabaseError(error)

    return {
      success: true,
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum
    }
  } catch (err: any) {
    console.error('Error fetching invoices:', err)
    throw createError({ statusCode: 500, message: err.message })
  }
})
