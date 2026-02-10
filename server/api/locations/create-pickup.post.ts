import { defineEventHandler, readBody, createError } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  try {
    console.log('🚀 create-pickup.post handler called')
    
    // ✅ 1. AUTHENTIFIZIERUNG
    const authUser = await getAuthenticatedUser(event)
    console.log('✅ Auth user:', authUser?.id)
    
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
      console.error('❌ User lookup failed:', userError)
      throw createError({ statusCode: 401, message: 'User not found' })
    }

    console.log('✅ User found:', user.id, 'tenant:', user.tenant_id)

    // ✅ 2. INPUT VALIDATION
    console.log('📖 Reading body...')
    let body
    try {
      body = await readBody(event)
      console.log('✅ Body read successfully')
    } catch (bodyError: any) {
      console.error('❌ Failed to read body:', bodyError.message)
      throw createError({ statusCode: 400, message: `Failed to parse request body: ${bodyError.message}`, data: { error: bodyError.message } })
    }
    const { address, latitude, longitude, postal_code, place_id, studentId, userId, name: locationName } = body

    console.log('📥 Received request body:', JSON.stringify({
      address: address ? `${address.substring(0, 50)}...` : undefined,
      latitude,
      longitude,
      postal_code,
      place_id: place_id ? `${String(place_id).substring(0, 30)}...` : undefined,
      studentId,
      userId,
      locationName
    }, null, 2))

    // Validate required fields
    if (!address || typeof address !== 'string' || !address.trim()) {
      const msg = 'Address is required and must be a string'
      console.error('❌ Validation failed: address invalid', { address, type: typeof address })
      throw createError({ statusCode: 400, message: msg, data: { validation: 'address' } })
    }

    // Accept either studentId (legacy) or userId (new)
    const targetUserId = userId || studentId
    if (!targetUserId || typeof targetUserId !== 'string' || !targetUserId.match(/^[0-9a-f\-]{36}$/i)) {
      const msg = `Invalid userId format: ${targetUserId}`
      console.error('❌ Validation failed: userId invalid', { targetUserId, type: typeof targetUserId })
      throw createError({ statusCode: 400, message: msg, data: { validation: 'userId' } })
    }

    if (!locationName || typeof locationName !== 'string' || !locationName.trim()) {
      const msg = 'Location name is required'
      console.error('❌ Validation failed: locationName invalid', { locationName, type: typeof locationName })
      throw createError({ statusCode: 400, message: msg, data: { validation: 'locationName' } })
    }

    // Validate optional numeric fields
    if (latitude !== null && latitude !== undefined && typeof latitude !== 'number') {
      const msg = 'Latitude must be a number'
      console.error('❌ Validation failed: latitude not a number', { latitude, type: typeof latitude })
      throw createError({ statusCode: 400, message: msg, data: { validation: 'latitude' } })
    }

    if (longitude !== null && longitude !== undefined && typeof longitude !== 'number') {
      const msg = 'Longitude must be a number'
      console.error('❌ Validation failed: longitude not a number', { longitude, type: typeof longitude })
      throw createError({ statusCode: 400, message: msg, data: { validation: 'longitude' } })
    }

    // ✅ 3. TENANT ISOLATION: Verify user exists in same tenant
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('id', targetUserId)
      .eq('tenant_id', user.tenant_id)
      .single()

    if (targetUserError || !targetUser) {
      console.error('❌ User not found or unauthorized:', { targetUserId, userTenantId: user.tenant_id, error: targetUserError })
      throw createError({ statusCode: 403, message: 'User not found or unauthorized' })
    }

    // ⚠️ WICHTIG: Allow inactive users to have pickup locations (they might be suspended but still have bookings)
    // Only reject if user is completely deleted (deleted_at is set)
    const { data: userDeleted } = await supabase
      .from('users')
      .select('deleted_at')
      .eq('id', targetUserId)
      .single()

    if (userDeleted?.deleted_at) {
      throw createError({ statusCode: 403, message: 'Cannot add location for deleted user' })
    }

    // ✅ 4. SANITY CHECK: Allow students, staff, and clients (customers) to have pickup locations
    console.log('🔍 Checking user role:', { targetUserId, role: targetUser.role })
    if (!['student', 'staff', 'client', 'customer'].includes(targetUser.role)) {
      console.error('❌ Invalid role for pickup location:', { targetUserId, role: targetUser.role })
      throw createError({ statusCode: 400, message: `Invalid role for pickup location: ${targetUser.role}. Only students, staff, clients and customers can have pickup locations` })
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
      postal_code: postal_code || null,
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
      postal_code: data.postal_code,
      location_type: 'pickup',
      source: 'pickup'
    }

  } catch (error: any) {
    console.error('❌ Error in create-pickup API:')
    console.error('  Message:', error?.message)
    console.error('  StatusCode:', error?.statusCode)
    console.error('  Stack:', error?.stack?.split('\n').slice(0, 3).join('\n'))
    
    // Re-throw H3 errors as-is
    if (error.statusCode) {
      console.error('🔴 Throwing H3 error with statusCode:', error.statusCode)
      throw error
    }
    
    // Wrap other errors with more detail
    console.error('🔴 Wrapping unexpected error')
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to create pickup location',
      data: { error: error.message }
    })
  }
})

