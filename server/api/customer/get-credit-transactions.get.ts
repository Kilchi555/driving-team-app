import { defineEventHandler, getHeader, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseAdmin()

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  const token = authHeader.substring(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!userProfile) throw createError({ statusCode: 404, statusMessage: 'Benutzerprofil nicht gefunden' })

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('id, transaction_type, amount_rappen, balance_before_rappen, balance_after_rappen, payment_method, notes, created_at')
    .eq('user_id', userProfile.id)
    .eq('tenant_id', userProfile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Fehler beim Laden der Transaktionen' })

  return data || []
})
