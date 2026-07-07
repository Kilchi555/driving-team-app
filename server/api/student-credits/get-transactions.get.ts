import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const supabase = getSupabaseAdmin()

  // Get caller's profile for tenant isolation
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, statusMessage: 'User profile not found' })
  }

  if (userProfile.role !== 'admin' && userProfile.role !== 'staff') {
    throw createError({ statusCode: 403, statusMessage: 'Admin or staff role required' })
  }

  const query = getQuery(event)
  const { user_id, limit = '50' } = query

  if (!user_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required parameter: user_id' })
  }

  const limitNum = Math.min(parseInt(limit as string) || 50, 500)

  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select(`
      *,
      created_by_user:users!credit_transactions_created_by_fkey (
        first_name,
        last_name
      )
    `)
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .order('created_at', { ascending: false })
    .limit(limitNum)

  if (error) {
    console.error('Error fetching credit transactions:', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to fetch credit transactions' })
  }

  return {
    success: true,
    data: transactions || []
  }
})
