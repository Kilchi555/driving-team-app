/**
 * GET /api/customer/locations
 *
 * Fetch all locations for tenant
 * 3-Layer: Auth + Validation → Transform → DB Query
 *
 * Security: Session auth, tenant isolation
 */

import { defineEventHandler, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { verifyAuth } from '~/server/utils/auth-helper'
import { logger } from '~/utils/logger'

const transformLocations = (locations: any[]): any[] => {
  return locations.map(loc => ({
    id: loc.id,
    name: loc.name || '',
    address: loc.address || '',
    formattedAddress: loc.formatted_address || '',
    city: loc.city || '',
    zip: loc.zip || '',
    coordinates: loc.coordinates || null,
    active: loc.is_active !== false
  }))
}

const fetchLocationsFromDb = async (tenantId: string): Promise<any[]> => {
  const supabase = getSupabaseAdmin()

  try {
    logger.debug(`📍 Fetching locations for tenant: ${tenantId}`)

    const { data, error } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        address,
        formatted_address,
        city,
        zip,
        coordinates,
        is_active,
        tenant_id
      `)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      logger.error(`❌ Database error fetching locations:`, error)
      return []
    }

    logger.debug(`✅ Fetched ${data?.length || 0} locations`)
    return data || []
  } catch (err: any) {
    logger.error('❌ Unexpected error in fetchLocationsFromDb:', err)
    return []
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    const auth = await verifyAuth(event)
    if (!auth) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    const { tenantId } = auth
    logger.debug(`🔐 Locations request for tenant: ${tenantId}`)

    const rawLocations = await fetchLocationsFromDb(tenantId)
    const transformedLocations = transformLocations(rawLocations)

    const duration = Date.now() - startTime
    logger.debug(`✅ Locations request completed in ${duration}ms`)

    return {
      success: true,
      data: transformedLocations,
      count: transformedLocations.length,
      duration
    }

  } catch (error: any) {
    const duration = Date.now() - startTime

    if (error.statusCode) {
      logger.warn(`⚠️ API error (${duration}ms):`, error.statusMessage)
      throw error
    }

    logger.error(`❌ Unexpected error (${duration}ms):`, error.message)
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
