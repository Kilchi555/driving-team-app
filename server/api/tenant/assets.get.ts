// server/api/tenant/assets.get.ts
// Returns tenant assets (logos, favicons) from the tenant_assets table

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const tenantId = query.tenantId as string

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing tenantId query parameter'
      })
    }

    const supabase = getSupabaseAdmin()

    // Query the vw_tenant_logos view for quick access
    const { data, error } = await supabase
      .from('vw_tenant_logos')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching tenant assets:', error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch tenant assets'
      })
    }

    // If view doesn't have data, fallback to querying tenants table
    if (!data) {
      logger.debug('View returned no data, falling back to tenants table:', tenantId)
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('logo_url, logo_square_url, logo_wide_url, logo_dark_url')
        .eq('id', tenantId)
        .single()

      if (tenantError) {
        logger.warn('Tenant not found:', tenantId)
        return {
          logo_url: null,
          logo_square_url: null,
          logo_wide_url: null,
          favicon_url: null
        }
      }

      return {
        logo_url: tenant?.logo_url,
        logo_square_url: tenant?.logo_square_url,
        logo_wide_url: tenant?.logo_wide_url,
        favicon_url: null // Not available in old schema
      }
    }

    logger.debug('Tenant assets loaded successfully:', tenantId)
    return data
  } catch (error) {
    logger.error('Error in tenant/assets.get:', error)
    throw error
  }
})
