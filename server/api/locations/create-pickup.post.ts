import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    const supabase = getSupabaseAdmin()

    // Get user from users table to get tenant_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !user) {
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    // ✅ 2. INPUT VALIDATION
    const body = await readBody(event)
    const { address, latitude, longitude, place_id, studentId, userId, name: locationName } = body

    // Validate required fields
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw createError({ statusCode: 400, message: 'Address is required and must be a string' })
    }

    // Accept either studentId (legacy) or userId (new)
    const targetUserId = userId || studentId
    if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.match(/^[0-9a-f\-]{36}$/i)) {
      throw createError({ statusCode: 400, message: 'Invalid userId format' })
    }

    if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
      throw createError({ statusCode: 400, message: 'Location name is required' })
    }

    // Validate optional numeric fields
    if (latitude !== null && latitude !== undefined && typeof latitude !== 'number') {
      throw createError({ statusCode: 400, message: 'Latitude must be a number' })
    }

    if (longitude !== null && longitude !== undefined && typeof longitude !== 'number') {
      throw createError({ statusCode: 400, message: 'Longitude must be a number' })
    }

    // ✅ 3. TENANT ISOLATION: Verify user is in same tenant
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', targetUserId)
      .eq('tenant_id', user.tenant_id)
      .eq('is_active', true)
      .single()

    if (userError || !targetUser) {
      console.error('❌ User not found or unauthorized:', { targetUserId, userTenantId: user.tenant_id, error: userError })
      throw createError({ statusCode: 403, message: 'User not found or unauthorized' })
    }

    // ✅ 4. SANITY CHECK: Only students and staff can have pickup locations
    if (!['student', 'staff'].includes(targetUser.role)) {
      throw createError({ statusCode: 400, message: 'Only students and staff can have pickup locations' })
    }

    // ✅ 5. INPUT SANITIZATION
    const sanitizedAddress = address.trim().substring(0, 500)
    const sanitizedName = locationName.trim().substring(0, 255)
    const sanitizedPlaceId = place_id ? String(place_id).substring(0, 500) : null

    const locationToSave = {
      location_type: 'pickup',
      user_id: targetUserId,
      tenant_id: user.tenant_id,
      name: sanitizedName,
      address: sanitizedAddress,
      latitude: latitude || null,
      longitude: longitude || null,
      google_place_id: sanitizedPlaceId,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📤 Saving pickup location:', {
      user_id: user.id,
      target_user_id: targetUserId,
      target_user_role: targetUser.role,
      tenant_id: user.tenant_id,
      name: sanitizedName
    })

    // ✅ 6. INSERT via Supabase (RLS will verify)
    const { data, error: saveError } = await supabase
      .from('locations')
      .insert(locationToSave)
      .select()
      .single()

    if (saveError) {
      console.error('❌ Supabase Error:', saveError)
      throw createError({ 
        statusCode: 500, 
        message: saveError.message || 'Failed to save location'
      })
    }

    console.log('✅ Pickup location created successfully:', data.id)

    return {
      id: data.id,
      name: data.name,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      location_type: 'pickup',
      source: 'pickup'
    }

  } catch (error: any) {
    console.error('❌ Error in create-pickup API:', error.message)
    
    // Re-throw H3 errors as-is
    if (error.statusCode) {
      throw error
    }
    
    // Wrap other errors
    throw createError({
      statusCode: 500,
      message: 'Failed to create pickup location'
    })
  }
})

