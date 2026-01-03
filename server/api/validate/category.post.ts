import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getClientIP } from '~/server/utils/ip-utils'
import { logAudit } from '~/server/utils/audit'
import { getHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined

  try {
    // Layer 1: Authentication - Verify JWT token
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = getSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid or expired token'
      })
    }
    authenticatedUserId = user.id

    // Layer 3: Input Validation
    const body = await readBody(event)
    const { categoryCode, tenantId } = body

    if (!categoryCode || typeof categoryCode !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'categoryCode is required and must be a string'
      })
    }

    if (!tenantId || typeof tenantId !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'tenantId is required and must be a string'
      })
    }

    // Layer 4: Authorization - Get requesting user's tenant
    const { data: requestingUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !requestingUser) {
      logger.error('Requesting user profile not found:', userError)
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    // Verify user belongs to the tenant they're validating for
    if (requestingUser.tenant_id !== tenantId && requestingUser.role !== 'superadmin') {
      logger.warn(`User ${authenticatedUserId} tried to validate category for different tenant`)
      throw createError({
        statusCode: 403,
        statusMessage: 'You can only validate categories for your own tenant'
      })
    }

    logger.debug('🔍 Validating category:', { categoryCode, tenantId })

    // Fetch category from database
    const { data: category, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id, code, name, is_active, tenant_id')
      .eq('code', categoryCode.trim())
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (categoryError) {
      logger.error('Error fetching category:', categoryError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Error validating category'
      })
    }

    // Category found and active
    if (category) {
      logger.debug('✅ Category valid:', category.code)
      await logAudit({
        user_id: authenticatedUserId,
        action: 'validate_category',
        resource_type: 'category',
        resource_id: category.id,
        status: 'success',
        ip_address: ipAddress,
        details: { categoryCode, result: 'found' }
      })

      return {
        valid: true,
        categoryCode: category.code,
        categoryName: category.name,
        categoryId: category.id
      }
    }

    // Category not found
    logger.warn('❌ Category not valid:', categoryCode)
    await logAudit({
      user_id: authenticatedUserId,
      action: 'validate_category',
      status: 'failed',
      error_message: `Category "${categoryCode}" not found or inactive`,
      ip_address: ipAddress,
      details: { categoryCode, result: 'not_found' }
    })

    return {
      valid: false,
      categoryCode,
      error: `Category "${categoryCode}" not found or is not active`
    }

  } catch (error: any) {
    logger.error('Error in validate/category API:', error)

    const errorMessage = error.statusMessage || error.message || 'Internal server error'
    const statusCode = error.statusCode || 500

    if (authenticatedUserId) {
      await logAudit({
        user_id: authenticatedUserId,
        action: 'validate_category',
        status: 'error',
        error_message: errorMessage,
        ip_address: ipAddress
      })
    }

    throw createError({ statusCode, statusMessage: errorMessage })
  }
})

