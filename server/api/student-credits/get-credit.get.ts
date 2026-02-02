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
    .select('id, tenant_id, role')
    .eq('id', authUser.id)
    .single()

  if (!userProfile) {
    throw createError({ statusCode: 403, message: 'User profile not found' })
  }
  
  // Verify access: can only access own credits or if admin
  const requestedUserId = user_id as string
  const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
  const isOwnCredit = authUser.id === requestedUserId
  
  if (!isOwnCredit && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Unauthorized to access this student credit' })
  }
  
  // Verify student is in same tenant (for non-admins)
  if (!isAdmin) {
    const { data: studentProfile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', requestedUserId)
      .single()
    
    if (!studentProfile || studentProfile.tenant_id !== userProfile.tenant_id) {
      throw createError({ statusCode: 403, message: 'Student not in your tenant' })
    }
  }

  // Get query parameters
  const query = getQuery(event)
  const { user_id } = query

  if (!user_id) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameter: user_id'
    })
  }

  // Fetch student credit with tenant isolation
  const { data: credit, error } = await supabase
    .from('student_credits')
    .select('*')
    .eq('user_id', user_id)
    .eq('tenant_id', userProfile.tenant_id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching student credit:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch student credit'
    })
  }

  return {
    success: true,
    data: credit
  }
})
