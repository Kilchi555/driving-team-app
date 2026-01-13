import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { validateUUID, throwValidationError } from '~/server/utils/validators'
import { logAudit } from '~/server/utils/audit'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined
  let requestingUser: any = null
  let targetUser: any = null

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    authenticatedUserId = authUser.id

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'adjust_credit',
      50, // maxRequests: 50 per minute (admin operation)
      60 * 1000 // windowMs: 1 minute
    )
    if (!rateLimitResult.allowed) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'
      })
    }

    // ============ LAYER 3: INPUT VALIDATION ============
    const body = await readBody(event)
    const { userId, amountRappen, reason, type } = body

    const errors: any = {}
    if (!userId || typeof userId !== 'string') {
      errors.userId = 'Valid user ID required'
    } else if (!validateUUID({ valid: userId })?.valid) {
      errors.userId = 'Invalid user ID format'
    }
    if (!amountRappen || typeof amountRappen !== 'number' || amountRappen <= 0) {
      errors.amountRappen = 'Valid positive amount required'
    }
    if (!reason || typeof reason !== 'string' || reason.length < 5) {
      errors.reason = 'Reason must be at least 5 characters'
    }
    if (!type || !['top_up', 'adjustment', 'refund', 'correction'].includes(type)) {
      errors.type = 'Valid type required: top_up, adjustment, refund, correction'
    }
    if (Object.keys(errors).length > 0) {
      throwValidationError(errors)
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ============ LAYER 4: GET AUTHENTICATED USER & VERIFY ADMIN ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authenticatedUserId)
      .single()

    if (userError || !userData) {
      logger.warn(`⚠️ Admin user not found for auth_user_id: ${authenticatedUserId}`)
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }

    requestingUser = userData
    tenantId = userData.tenant_id

    // ============ LAYER 5: VERIFY ADMIN PERMISSIONS ============
    // Only admins and tenant_admins can adjust credit
    if (!['admin', 'tenant_admin'].includes(userData.role)) {
      logger.warn(
        `⚠️ Non-admin user ${userData.id} tried to adjust credit`,
        { role: userData.role }
      )
      throw createError({
        statusCode: 403,
        statusMessage: 'Du hast keine Berechtigung, Guthaben anzupassen'
      })
    }

    // ============ LAYER 6: GET TARGET USER & VERIFY TENANT MATCH ============
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUserData) {
      logger.warn(`⚠️ Target user not found: ${userId}`)
      throw createError({ statusCode: 404, statusMessage: 'Student not found' })
    }

    targetUser = targetUserData

    // Verify tenant isolation - can only adjust users in same tenant
    if (targetUser.tenant_id !== tenantId) {
      logger.warn(
        `⚠️ Admin ${requestingUser.id} tried to adjust credit for user from different tenant`,
        { adminTenant: tenantId, targetTenant: targetUser.tenant_id }
      )
      throw createError({
        statusCode: 403,
        statusMessage: 'Cannot adjust credit for users from other tenants'
      })
    }

    // ============ LAYER 7: GET OR CREATE STUDENT CREDITS ============
    const { data: studentCredits, error: creditError } = await supabaseAdmin
      .from('student_credits')
      .select('id, balance_rappen')
      .eq('user_id', userId)
      .single()

    let creditRecord = studentCredits
    if (creditError && creditError.code === 'PGRST116') {
      // No record exists, create one
      const { data: newCredit, error: createError } = await supabaseAdmin
        .from('student_credits')
        .insert([{
          user_id: userId,
          tenant_id: tenantId,
          balance_rappen: 0
        }])
        .select()
        .single()

      if (createError) {
        logger.error('❌ Failed to create student_credits:', createError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to create credit record' })
      }
      creditRecord = newCredit
    } else if (creditError) {
      logger.error('❌ Failed to fetch student_credits:', creditError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch credit record' })
    }

    const oldBalance = creditRecord?.balance_rappen || 0
    const newBalance = oldBalance + amountRappen

    // ============ LAYER 8: UPDATE STUDENT CREDITS BALANCE ============
    const { error: updateError } = await supabaseAdmin
      .from('student_credits')
      .update({ balance_rappen: newBalance })
      .eq('user_id', userId)

    if (updateError) {
      logger.error('❌ Failed to update student_credits:', updateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update credit balance' })
    }

    // ============ LAYER 9: CREATE CREDIT TRANSACTION RECORD ============
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('credit_transactions')
      .insert([{
        user_id: userId,
        tenant_id: tenantId,
        amount_rappen: amountRappen,
        transaction_type: type,
        reason: reason,
        created_by: requestingUser.id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (transactionError) {
      logger.warn('⚠️ Failed to create credit_transaction (non-critical):', transactionError)
      // Don't fail - the important part (updating balance) succeeded
    }

    logger.debug('✅ Student credit adjusted:', {
      studentId: userId,
      oldBalance: (oldBalance / 100).toFixed(2),
      newBalance: (newBalance / 100).toFixed(2),
      adjustmentAmount: (amountRappen / 100).toFixed(2),
      type,
      reason
    })

    // ============ AUDIT LOGGING: Success ============
    await logAudit({
      user_id: requestingUser.id,
      auth_user_id: authenticatedUserId,
      action: 'adjust_credit',
      resource_type: 'student_credit',
      resource_id: userId,
      status: 'success',
      tenant_id: tenantId,
      details: {
        student_id: userId,
        old_balance_chf: (oldBalance / 100).toFixed(2),
        new_balance_chf: (newBalance / 100).toFixed(2),
        adjustment_chf: (amountRappen / 100).toFixed(2),
        type,
        reason,
        transaction_id: transaction?.id || null,
        duration_ms: Date.now() - startTime
      }
    })

    return {
      success: true,
      message: `Guthaben erfolgreich angepasst: ${(amountRappen / 100).toFixed(2)} CHF`,
      student: {
        id: userId,
        oldBalance: oldBalance,
        newBalance: newBalance
      },
      transaction: transaction || null
    }

  } catch (error: any) {
    logger.error('❌ Error adjusting credit:', error)

    // ============ AUDIT LOGGING: Error ============
    await logAudit({
      user_id: requestingUser?.id,
      auth_user_id: authenticatedUserId,
      action: 'adjust_credit',
      resource_type: 'student_credit',
      resource_id: body?.userId,
      status: 'error',
      error_message: error.message || error.statusMessage || 'Unknown error',
      tenant_id: tenantId,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw error
  }
})

