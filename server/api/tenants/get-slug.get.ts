/**
 * GET /api/tenants/get-slug?id=<tenant_uuid>
 * Returns the public slug for an active tenant (used for redirects / share links).
 */
import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = typeof query.id === 'string' ? query.id.trim() : ''

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id query parameter is required' })
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tenants')
      .select('id, slug')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      logger.error('❌ get-slug lookup failed:', error.message)
      throw createError({ statusCode: 500, statusMessage: 'Failed to resolve tenant slug' })
    }

    if (!data?.slug) {
      throw createError({ statusCode: 404, statusMessage: 'Tenant not found' })
    }

    return { success: true, data: { id: data.id, slug: data.slug } }
  } catch (err: any) {
    if (err?.statusCode) throw err
    logger.error('❌ get-slug unexpected error:', err)
    throw createError({ statusCode: 500, statusMessage: 'Failed to resolve tenant slug' })
  }
})
