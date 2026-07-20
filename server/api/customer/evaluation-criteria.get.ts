/**
 * GET /api/customer/evaluation-criteria
 *
 * Fetch evaluation criteria
 * 3-Layer: Auth → Transform → DB
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const transformCriteria = (criteria: any[]): any[] => {
  return criteria.map(c => ({
    id: c.id,
    name: c.name || '',
    description: c.description || '',
    category: c.category_name || 'General',
    shortCode: c.short_code || '',
    sortOrder: c.sort_order || 999
  }))
}

const fetchCriteriaFromDb = async (tenantId: string): Promise<any[]> => {
  const supabase = getSupabaseAdmin()

  try {
    logger.debug(`📊 Fetching evaluation criteria for tenant: ${tenantId}`)

    const { data, error } = await supabase
      .from('evaluation_criteria')
      .select('id, name, description, category_name, short_code, sort_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order')

    if (error) {
      logger.error(`❌ Database error:`, error)
      return []
    }

    logger.debug(`✅ Fetched ${data?.length || 0} evaluation criteria`)
    return data || []
  } catch (err: any) {
    logger.error('❌ Unexpected error:', err)
    return []
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const { tenantId } = auth

    const rawCriteria = await fetchCriteriaFromDb(tenantId)
    const transformed = transformCriteria(rawCriteria)

    return {
      success: true,
      data: transformed,
      count: transformed.length,
      duration: Date.now() - startTime
    }

  } catch (error: any) {
    if (error.statusCode) throw error
    logger.error('❌ Error:', error.message)
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
