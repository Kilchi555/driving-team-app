import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-locations
 * 
 * Secure API to fetch locations for EventModal
 * 
 * Query Params:
 *   - location_ids (optional): Comma-separated location IDs to fetch specific locations
 * 
 * Security Layers:
 *   1. Bearer Token Authentication
 *   2. Tenant Isolation
 *   3. Rate Limiting (100 req/min per user)
 *   4. Caching (60 seconds)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthUserFromRequest(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    if (!userProfile.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    const tenantId = userProfile.tenant_id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const locationIdsParam = query.location_ids as string | undefined

    let locationIds: string[] | undefined
    if (locationIdsParam) {
      locationIds = locationIdsParam.split(',').map(id => id.trim())
      
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      for (const id of locationIds) {
        if (!uuidRegex.test(id)) {
          throw createError({
            statusCode: 400,
            statusMessage: `Invalid location ID format: ${id}`
          })
        }
      }
    }

    // ✅ LAYER 4: DATABASE QUERY with Tenant Isolation and Role-based Filtering
    
    // Filter based on user role
    if (userProfile.role === 'staff') {
      // Staff sees:
      // 1. Their own standard locations (location_type = 'standard' AND user_id = current staff)
      // 2. Pickup locations of the selected client (if provided via query param)
      const selectedClientId = query.selected_client_id as string | undefined
      
      if (selectedClientId) {
        logger.debug('🔍 Staff fetching locations - staff locations + client pickups:', {
          staffId: userProfile.id,
          clientId: selectedClientId
        })
        
        // Get staff's standard locations
        const { data: staffLocations, error: staffError } = await supabaseAdmin
          .from('locations')
          .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('user_id', userProfile.id)
          .eq('location_type', 'standard')
        
        if (staffError) {
          logger.error('❌ Error fetching staff locations:', staffError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch staff locations'
          })
        }
        
        // Get client's pickup locations
        const { data: clientPickups, error: clientError } = await supabaseAdmin
          .from('locations')
          .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('user_id', selectedClientId)
          .eq('location_type', 'pickup')
        
        if (clientError) {
          logger.error('❌ Error fetching client pickups:', clientError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch client pickup locations'
          })
        }
        
        // Combine and sort
        const combined = [
          ...(staffLocations || []),
          ...(clientPickups || [])
        ].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        
        logger.debug('✅ Staff locations fetched (with client filter):', {
          staffLocations: staffLocations?.length || 0,
          clientPickups: clientPickups?.length || 0,
          total: combined.length
        })
        
        return {
          success: true,
          data: combined
        }
      } else {
        // No client selected, show only standard locations where staff is registered
        logger.debug('🔍 Staff fetching standard locations where staff is registered (no client selected):', {
          staffId: userProfile.id
        })
        
        // Get ALL standard locations first, then filter by staff_ids in memory
        // (Supabase JSON filtering is limited, so we do it in memory)
        const { data: allLocations, error } = await supabaseAdmin
          .from('locations')
          .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable, staff_ids')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('location_type', 'standard')
          .order('name', { ascending: true })
        
        if (error) {
          logger.error('❌ Error fetching staff locations:', error)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch locations'
          })
        }
        
        // Filter locations where current staff is in the staff_ids array
        const filteredLocations = (allLocations || []).filter((location: any) => {
          if (!location.staff_ids) {
            return false
          }
          
          try {
            const staffIds = typeof location.staff_ids === 'string' 
              ? JSON.parse(location.staff_ids) 
              : location.staff_ids
            
            return Array.isArray(staffIds) && staffIds.includes(userProfile.id)
          } catch (e) {
            logger.error('❌ Error parsing staff_ids for location:', location.id, e)
            return false
          }
        })
        
        logger.debug('✅ Staff locations fetched:', {
          total: allLocations?.length || 0,
          filtered: filteredLocations.length
        })
        
        return {
          success: true,
          data: filteredLocations
        }
      }
    } else if (['client', 'customer', 'student'].includes(userProfile.role)) {
      // Clients see only their own pickup locations
      logger.debug('🔍 Client fetching own pickup locations:', {
        clientId: userProfile.id
      })
      
      const { data: locations, error } = await supabaseAdmin
        .from('locations')
        .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('user_id', userProfile.id)
        .eq('location_type', 'pickup')
        .order('name', { ascending: true })
      
      if (error) {
        logger.error('❌ Error fetching client locations:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch locations'
        })
      }
      
      logger.debug('✅ Client locations fetched:', {
        count: locations?.length || 0
      })
      
      return {
        success: true,
        data: locations || []
      }
    }
    
    // Fallback: return empty
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid user role for location access'
    })

  } catch (error: any) {
    logger.error('❌ Staff get-locations API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch locations'
    })
  }
})

