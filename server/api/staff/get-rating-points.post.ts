// server/api/staff/get-rating-points.post.ts
// Get evaluation rating scale points for the authenticated user's tenant

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUserWithDbId } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = await getAuthenticatedUserWithDbId(event)

  if (!user?.tenant_id) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  const tenantId = user.tenant_id
  const supabase = getSupabaseAdmin()

  try {
    // Prefer tenant-owned scale exclusively when the tenant has customized it
    const { data: tenantScale, error: tenantError } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('rating', { ascending: true })

    if (tenantError) throw tenantError

    if (tenantScale && tenantScale.length > 0) {
      return {
        success: true,
        data: tenantScale,
        tenantId
      }
    }

    // Bootstrap only: tenants without any own scale see global defaults
    const { data: globalScale, error: globalError } = await supabase
      .from('evaluation_scale')
      .select('rating, color, label')
      .is('tenant_id', null)
      .eq('is_active', true)
      .order('rating', { ascending: true })

    if (globalError) throw globalError

    // Deduplicate by rating number (global templates can contain duplicates)
    const byRating = new Map<number, { rating: number; color: string; label: string }>()
    for (const item of globalScale || []) {
      if (!byRating.has(item.rating)) byRating.set(item.rating, item)
    }

    return {
      success: true,
      data: Array.from(byRating.values()).sort((a, b) => a.rating - b.rating),
      tenantId
    }
  } catch (err: any) {
    console.error('❌ Error loading evaluation scale:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to load rating points'
    })
  }
})
