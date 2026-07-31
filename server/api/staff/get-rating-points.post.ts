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
    // Tenant-specific scale first
    const { data: dataWithTenant, error: errorWithTenant } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('rating', { ascending: true })

    if (!errorWithTenant && dataWithTenant && dataWithTenant.length > 0) {
      return {
        success: true,
        data: dataWithTenant
      }
    }

    // Fallback: global defaults (tenant_id IS NULL)
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .is('tenant_id', null)
      .eq('is_active', true)
      .order('rating', { ascending: true })

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
