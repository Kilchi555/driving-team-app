import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: staffUser } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!staffUser || !['admin', 'tenant_admin', 'staff'].includes(staffUser.role)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const query = getQuery(event)
  const invoice_id = query.invoice_id as string
  if (!invoice_id) throw createError({ statusCode: 400, statusMessage: 'invoice_id required' })

  const { data, error } = await supabase
    .from('invoice_payments')
    .select('id, amount_rappen, payment_date, payment_method, notes, status, created_at')
    .eq('invoice_id', invoice_id)
    .eq('tenant_id', staffUser.tenant_id)
    .order('payment_date', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, data: data || [] }
})
