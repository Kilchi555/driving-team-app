import { defineEventHandler, createError } from 'h3'
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
