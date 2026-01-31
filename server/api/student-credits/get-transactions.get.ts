import { defineEventHandler, getQuery, createError, getHeader } from 'h3'
import { getSupabase } from '~/utils/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabase()

  // Get auth token from headers
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing or invalid authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')

  // Get current user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authUser) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }

  // Get query parameters
  const query = getQuery(event)
  const { user_id, limit = '50' } = query

  if (!user_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: user_id'
    })
  }

  const limitNum = Math.min(parseInt(limit as string) || 50, 500)

  // Fetch credit transactions with tenant isolation
  const { data: transactions, error } = await supabase
    .from('credit_transactions')
    .select(`
      *,
      user:users!credit_transactions_user_id_fkey (
        first_name,
        last_name,
        email
      ),
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
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch credit transactions'
    })
  }

  return {
    success: true,
    data: transactions || []
  }
})
