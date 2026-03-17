import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  const { user_id } = getQuery(event) as { user_id?: string }
  if (!user_id) throw createError({ statusCode: 400, statusMessage: 'user_id is required' })

  // Verify the requesting staff belongs to the same tenant as the target user
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('id', user_id)
    .single()

  if (!targetUser) throw createError({ statusCode: 404, statusMessage: 'Student not found' })
  if (targetUser.tenant_id !== authUser.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, transaction_type, amount_rappen, balance_before_rappen, balance_after_rappen, payment_method, notes, created_at')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Transaktionen' })

  return data || []
})
