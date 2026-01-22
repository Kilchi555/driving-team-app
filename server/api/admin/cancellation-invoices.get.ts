import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  // ✅ Auth check
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  const token = authHeader.substring(7)

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw createError({ statusCode: 500, message: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // ✅ Verify user token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  // ✅ Check if user is admin/staff
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    throw createError({ statusCode: 403, message: 'User not found' })
  }

  if (!['admin', 'staff', 'superadmin'].includes(userData.role)) {
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

