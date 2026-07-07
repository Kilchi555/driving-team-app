import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser?.id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const supabase = getSupabaseAdmin()

  const { data: userProfile } = await supabase
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!userProfile) throw createError({ statusCode: 403, statusMessage: 'User profile not found' })

  if (userProfile.role !== 'admin' && userProfile.role !== 'staff') {
    throw createError({ statusCode: 403, message: 'Insufficient permissions' })
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
