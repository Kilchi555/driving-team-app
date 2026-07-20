import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  // ✅ Auth check — Bearer header with HTTP-only-cookie fallback + token
  // refresh, instead of a raw Bearer-only check that would 401 whenever the
  // client's access token had just expired.
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  // ✅ Check if user is admin/staff
  const userData = authUser.db_user_id
    ? { role: authUser.role, tenant_id: authUser.tenant_id }
    : null

  if (!userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'super_admin'].includes(userData.role)) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  // ✅ Get query params
  const query = getQuery(event)
  const search = query.search as string
  const status = query.status as string

  try {
    // ✅ Load tenant info
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name, slug')
      .eq('id', userData.tenant_id)
      .single()

    // ✅ Build query for cancellation invoices
    let invoicesQuery = supabase
      .from('invoices')
      .select(`
        *,
        appointments!inner(
          title,
          start_time,
          end_time,
          duration_minutes,
          status,
          type,
          users!inner(
            first_name,
            last_name,
            email
          )
        )
      `)
      .eq('tenant_id', userData.tenant_id)
      .eq('type', 'cancellation')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search && search.trim()) {
      invoicesQuery = invoicesQuery.or(`invoice_number.ilike.%${search}%,appointments.users.first_name.ilike.%${search}%,appointments.users.last_name.ilike.%${search}%`)
    }

    // Apply status filter
    if (status && status !== 'all') {
      invoicesQuery = invoicesQuery.eq('status', status)
    }

    const { data: invoices, error: invoicesError } = await invoicesQuery

    if (invoicesError) {
      console.error('Error loading cancellation invoices:', invoicesError)
      throw createError({ statusCode: 500, message: 'Failed to load invoices' })
    }

    return {
      invoices: invoices || [],
      tenant: tenantData
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    console.error('Error loading cancellation invoices:', error)
    throw createError({ statusCode: 500, message: 'Failed to load cancellation invoices' })
  }
})

