// server/api/staff/get-rating-points.post.ts
// Get evaluation rating scale points for a tenant

import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tenantId } = body

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      message: 'tenantId is required'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    // Try with tenant_id first
    const { data: dataWithTenant, error: errorWithTenant } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)

    if (!errorWithTenant && dataWithTenant && dataWithTenant.length > 0) {
      return {
        success: true,
        data: dataWithTenant
      }
    }

    // Fallback: try without tenant_id filter (for backwards compatibility)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .eq('is_active', true)

    if (fallbackError) throw fallbackError

    return {
      success: true,
      data: fallbackData || []
    }
  } catch (err: any) {
    console.error('❌ Error loading evaluation scale:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load rating points'
    })
  }
})
