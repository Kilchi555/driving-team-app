import { defineEventHandler, createError, getHeader } from 'h3'
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

  // Fetch all credits for tenant
  const { data: credits, error } = await supabase
    .from('student_credits')
    .select('balance_rappen')
    .eq('tenant_id', userProfile.tenant_id)

  if (error) {
    console.error('Error fetching credit statistics:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch credit statistics'
    })
  }

  const totalBalance = credits?.reduce((sum, credit) => sum + credit.balance_rappen, 0) || 0
  const activeStudents = credits?.filter(credit => credit.balance_rappen > 0).length || 0
  const averageBalance = credits && credits.length > 0 ? totalBalance / credits.length : 0

  return {
    success: true,
    data: {
      totalCredits: credits?.length || 0,
      totalBalance,
      activeStudents,
      averageBalance
    }
  }
})
