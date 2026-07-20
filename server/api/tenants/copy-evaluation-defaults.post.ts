import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  try {
    const supabase = getSupabaseAdmin()

    const user = await getAuthenticatedUser(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Not authenticated'
      })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile?.tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No tenant found for user'
      })
    }

    // Check if user has permission (admin or super_admin)
    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    // Copy default evaluation data to tenant
    const { error } = await supabase
      .rpc('copy_default_evaluation_data_to_tenant', { 
        target_tenant_id: userProfile.tenant_id 
      })

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to copy default data: ${error.message}`
      })
    }

    return {
      success: true,
      message: 'Default evaluation data copied successfully',
      tenant_id: userProfile.tenant_id
    }

  } catch (error: any) {
    console.error('Error copying evaluation defaults:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to copy evaluation defaults'
    })
  }
})
