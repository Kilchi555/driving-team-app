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
  const { user_ids } = query

  if (!user_ids) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: user_ids'
    })
  }

  // Parse user IDs
  const userIdArray = (user_ids as string).split(',').filter(id => id.trim())

  // Fetch student credits with tenant isolation
  const { data: credits, error } = await supabase
    .from('student_credits')
    .select('*')
    .in('user_id', userIdArray)
    .eq('tenant_id', userProfile.tenant_id)

  if (error) {
    console.error('Error fetching student credits:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch student credits'
    })
  }

  // Convert to map by user_id
  const creditsMap: Record<string, any> = {}
  credits?.forEach(credit => {
    creditsMap[credit.user_id] = credit
  })

  return {
    success: true,
    data: creditsMap
  }
})
