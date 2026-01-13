// server/api/evaluation/criteria.get.ts
// Secure API for fetching evaluation criteria
// Security: 10-Layer Protection

import { defineEventHandler, createError, getHeader, getQuery } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { checkRateLimit } from '~/server/utils/rate-limiter'
import { logAudit } from '~/server/utils/audit'
import { getClientIP } from '~/server/utils/ip-utils'

interface EvaluationCriteriaResponse {
  success: boolean
  criteria?: Array<{
    id: string
    name: string
  }>
  error?: string
}

export default defineEventHandler(async (event): Promise<EvaluationCriteriaResponse> => {
  const startTime = Date.now()
  const ipAddress = getClientIP(event)
  let authenticatedUserId: string | undefined
  let tenantId: string | undefined

  try {
    // ============ LAYER 1: AUTHENTICATION ============
    const authHeader = getHeader(event, 'authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const token = authHeader.substring(7)
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid authentication' })
    }

    authenticatedUserId = user.id

    // ============ LAYER 2: RATE LIMITING ============
    const rateLimitResult = await checkRateLimit(
      authenticatedUserId,
      'get_evaluation_criteria',
      60, // 60 requests per minute
      60000
    )
    if (!rateLimitResult.allowed) {
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }

    // ============ LAYER 3: GET USER'S TENANT ============
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('auth_user_id', authenticatedUserId)
      .eq('is_active', true)
      .single()

    if (userError || !userData) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    tenantId = userData.tenant_id

    // ============ LAYER 4: PARSE QUERY PARAMS ============
    const query = getQuery(event)
    const criteriaIds = query.ids ? String(query.ids).split(',').filter(Boolean) : null

    // ============ LAYER 5: FETCH CRITERIA (TENANT ISOLATED) ============
    let criteriaQuery = supabaseAdmin
      .from('evaluation_criteria')
      .select('id, name')
      .eq('tenant_id', tenantId)

    // Filter by specific IDs if provided
    if (criteriaIds && criteriaIds.length > 0) {
      criteriaQuery = criteriaQuery.in('id', criteriaIds)
    }

    const { data: criteria, error: criteriaError } = await criteriaQuery

    if (criteriaError) {
      logger.error('❌ Error fetching evaluation criteria:', criteriaError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch evaluation criteria' })
    }

    // ============ LAYER 6: AUDIT LOGGING ============
    await logAudit({
      user_id: userData.id,
      auth_user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'get_evaluation_criteria',
      resource_type: 'evaluation_criteria',
      status: 'success',
      ip_address: ipAddress,
      details: {
        criteria_count: criteria?.length || 0,
        filtered_by_ids: !!criteriaIds,
        duration_ms: Date.now() - startTime
      }
    })

    logger.debug('✅ Evaluation criteria loaded:', criteria?.length || 0)

    return {
      success: true,
      criteria: criteria || []
    }

  } catch (error: any) {
    logger.error('❌ Evaluation criteria API error:', error)
    
    await logAudit({
      auth_user_id: authenticatedUserId,
      tenant_id: tenantId,
      action: 'get_evaluation_criteria',
      status: 'failed',
      error_message: error.statusMessage || error.message,
      ip_address: ipAddress,
      details: {
        duration_ms: Date.now() - startTime
      }
    })

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch evaluation criteria'
    })
  }
})

