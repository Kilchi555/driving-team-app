import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { applyEvaluationDefaults } from '~/server/utils/business-type-presets'

/**
 * Seeds evaluation curriculum templates onto the current tenant.
 * Only copies templates matching the tenant's business_type
 * (Fahrschul-Vorlagen are never applied to consulting/coaching/…).
 */
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

    if (!['admin', 'super_admin'].includes(userProfile.role)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions'
      })
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('business_type')
      .eq('id', userProfile.tenant_id)
      .maybeSingle()

    const businessType = tenant?.business_type || 'driving_school'

    await applyEvaluationDefaults(supabase, userProfile.tenant_id, businessType)

    return {
      success: true,
      message: businessType === 'driving_school'
        ? 'Default evaluation data copied successfully'
        : `Evaluation templates for ${businessType} applied (empty if none exist)`,
      tenant_id: userProfile.tenant_id,
      business_type: businessType
    }

  } catch (error: any) {
    console.error('Error copying evaluation defaults:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to copy evaluation defaults'
    })
  }
})
