import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthUserFromRequest } from '~/server/utils/auth-helper'
import { createClient } from '@supabase/supabase-js'
import logger from '~/utils/logger'
import { ensureClientPickupLocation } from '~/server/utils/ensure-client-pickup-location'

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

    // ✅ Direct ID lookup (used e.g. by EventModal to resolve a previously saved
    // location - standard OR pickup - that may not be part of the current
    // role-based list, such as another student's pickup point on an existing
    // appointment). Scoped to the caller's tenant; intentionally not filtered
    // by is_active so historical appointments still resolve correctly.
    if (locationIds && locationIds.length > 0) {
      const { data: locationsById, error: byIdError } = await supabaseAdmin
        .from('locations')
        .select('id, name, address, formatted_address, postal_code, canton, city, tenant_id, location_type, user_id, is_active, public_bookable')
        .eq('tenant_id', tenantId)
        .in('id', locationIds)

      if (byIdError) {
        logger.error('❌ Error fetching locations by id:', byIdError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch locations by id'
        })
      }

      return {
        success: true,
        data: locationsById || []
      }
    }

    // Filter based on user role
    if (userProfile.role === 'staff') {
      // Staff sees:
      // 1. Standard locations where they are listed in staff_ids
      // 2. Pickup locations of the selected client (if provided via query param)
      const selectedClientId = query.selected_client_id as string | undefined
      
      if (selectedClientId) {
        logger.debug('🔍 Staff fetching locations - staff locations + client pickups:', {
          staffId: userProfile.id,
          clientId: selectedClientId
        })

        // Standard locations are shared via staff_ids (user_id is typically null).
        // Must NOT filter standards by user_id — that hides school locations like Leuholz.
        const [{ data: allStandards, error: staffError }, { data: clientPickups, error: clientError }] =
          await Promise.all([
            supabaseAdmin
              .from('locations')
              .select('id, name, address, formatted_address, postal_code, canton, city, tenant_id, location_type, user_id, is_active, public_bookable, staff_ids, time_windows')
              .eq('tenant_id', tenantId)
              .eq('is_active', true)
              .eq('location_type', 'standard'),
            supabaseAdmin
              .from('locations')
              .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable')
              .eq('tenant_id', tenantId)
              .eq('is_active', true)
              .eq('user_id', selectedClientId)
              .eq('location_type', 'pickup')
          ])

        if (staffError) {
          logger.error('❌ Error fetching staff locations:', staffError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch staff locations'
          })
        }

        if (clientError) {
          logger.error('❌ Error fetching client pickups:', clientError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch client pickup locations'
          })
        }

        const staffLocations = (allStandards || []).filter((location: any) => {
          if (!location.staff_ids) return false
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

        // Lazy-promote guest/online pickup addresses that were only stored on appointments
        // (common for no-login clients). Creates a reusable locations row once.
        let pickups = clientPickups || []
        try {
          const { data: lastPickupAppt } = await supabaseAdmin
            .from('appointments')
            .select('customer_pickup_address, customer_pickup_plz')
            .eq('user_id', selectedClientId)
            .eq('tenant_id', tenantId)
            .not('customer_pickup_address', 'is', null)
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (lastPickupAppt?.customer_pickup_address?.trim()) {
            const promoted = await ensureClientPickupLocation(supabaseAdmin, {
              tenantId,
              clientUserId: selectedClientId,
              address: lastPickupAppt.customer_pickup_address,
              name: 'Pickup-Adresse',
              postalCode: lastPickupAppt.customer_pickup_plz || null
            })
            if (promoted && !pickups.some((p) => p.id === promoted.id)) {
              pickups = [...pickups, promoted]
            }
          }
        } catch (promoteErr: any) {
          logger.warn('⚠️ Could not promote appointment pickup address:', promoteErr?.message)
        }

        // Combine and sort (strip staff_ids from response payload for consistency)
        const combined = [
          ...staffLocations.map(({ staff_ids: _staffIds, ...rest }: any) => rest),
          ...pickups
        ].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

        logger.debug('✅ Staff locations fetched (with client filter):', {
          staffLocations: staffLocations.length,
          clientPickups: pickups.length,
          total: combined.length
        })

        return {
          success: true,
          data: combined
        }
      } else {
        // No client selected:
        // - default: only standard locations where this staff is registered (EventModal etc.)
        // - include_all_standard=true: all tenant standard locations (StaffSettings join UI)
        const includeAllStandard = query.include_all_standard === 'true' || query.include_all_standard === '1'

        logger.debug('🔍 Staff fetching standard locations (no client selected):', {
          staffId: userProfile.id,
          includeAllStandard
        })
        
        // Get ALL standard locations first, then filter by staff_ids in memory
        // (Supabase JSON filtering is limited, so we do it in memory)
        const { data: allLocations, error } = await supabaseAdmin
          .from('locations')
          .select('id, name, address, formatted_address, postal_code, canton, city, tenant_id, location_type, user_id, is_active, public_bookable, staff_ids, time_windows')
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

        if (includeAllStandard) {
          logger.debug('✅ Staff locations fetched (all standard):', {
            total: allLocations?.length || 0
          })
          return {
            success: true,
            data: allLocations || []
          }
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
    } else if (['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)) {
      // Admins see all active locations in their tenant.
      // With selected_client_id: all standards + that client's pickups (same UX as staff).
      const selectedClientId = query.selected_client_id as string | undefined

      logger.debug('🔍 Admin fetching locations:', {
        adminId: userProfile.id,
        role: userProfile.role,
        selectedClientId: selectedClientId || null
      })

      if (selectedClientId) {
        const [{ data: standards, error: standardsError }, { data: clientPickups, error: pickupsError }] =
          await Promise.all([
            supabaseAdmin
              .from('locations')
              .select('id, name, address, formatted_address, postal_code, canton, city, tenant_id, location_type, user_id, is_active, public_bookable, time_windows')
              .eq('tenant_id', tenantId)
              .eq('is_active', true)
              .eq('location_type', 'standard'),
            supabaseAdmin
              .from('locations')
              .select('id, name, address, formatted_address, postal_code, city, tenant_id, location_type, user_id, is_active, public_bookable')
              .eq('tenant_id', tenantId)
              .eq('is_active', true)
              .eq('user_id', selectedClientId)
              .eq('location_type', 'pickup')
          ])

        if (standardsError || pickupsError) {
          logger.error('❌ Error fetching admin locations (with client filter):', standardsError || pickupsError)
          throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch locations'
          })
        }

        let pickups = clientPickups || []
        try {
          const { data: lastPickupAppt } = await supabaseAdmin
            .from('appointments')
            .select('customer_pickup_address, customer_pickup_plz')
            .eq('user_id', selectedClientId)
            .eq('tenant_id', tenantId)
            .not('customer_pickup_address', 'is', null)
            .order('start_time', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (lastPickupAppt?.customer_pickup_address?.trim()) {
            const promoted = await ensureClientPickupLocation(supabaseAdmin, {
              tenantId,
              clientUserId: selectedClientId,
              address: lastPickupAppt.customer_pickup_address,
              name: 'Pickup-Adresse',
              postalCode: lastPickupAppt.customer_pickup_plz || null
            })
            if (promoted && !pickups.some((p) => p.id === promoted.id)) {
              pickups = [...pickups, promoted]
            }
          }
        } catch (promoteErr: any) {
          logger.warn('⚠️ Could not promote appointment pickup address (admin):', promoteErr?.message)
        }

        const combined = [
          ...(standards || []),
          ...pickups
        ].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

        return {
          success: true,
          data: combined
        }
      }
      
      const { data: locations, error } = await supabaseAdmin
        .from('locations')
        .select('id, name, address, formatted_address, postal_code, canton, city, tenant_id, location_type, user_id, is_active, public_bookable, time_windows')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (error) {
        logger.error('❌ Error fetching admin locations:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch locations'
        })
      }
      
      logger.debug('✅ Admin locations fetched:', {
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

