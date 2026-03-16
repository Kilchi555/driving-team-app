import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const user = await getAuthenticatedUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, transaction_type, amount_rappen, balance_before_rappen, balance_after_rappen, payment_method, notes, created_at')
    .eq('user_id', user.id)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Transaktionen' })

  return data || []
})
