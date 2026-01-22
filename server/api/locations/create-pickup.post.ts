import { defineEventHandler, readBody, createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // ✅ 1. AUTHENTIFIZIERUNG
    const user = await requireAuth(event)
    if (!user?.id || !user?.tenant_id) {
      throw createError({ statusCode: 401, message: 'Unauthorized' })
    }

    // ✅ 2. INPUT VALIDATION
    const body = await readBody(event)
    const { address, latitude, longitude, place_id, studentId, name: locationName } = body

    // Validate required fields
    if (!address || typeof address !== 'string' || !address.trim()) {
      throw createError({ statusCode: 400, message: 'Address is required and must be a string' })
    }

    if (!studentId || typeof studentId !== 'string' || !studentId.match(/^[0-9a-f\-]{36}$/i)) {
      throw createError({ statusCode: 400, message: 'Invalid studentId format' })
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

    // ✅ 3. TENANT ISOLATION: Verify user owns the student
    const supabase = await getSupabaseServerClient(event)

    const { data: student, error: studentError } = await supabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', studentId)
      .eq('tenant_id', user.tenant_id)
      .eq('is_active', true)
      .single()

    if (studentError || !student) {
      console.error('❌ Student not found or unauthorized:', { studentId, userTenantId: user.tenant_id, error: studentError })
      throw createError({ statusCode: 403, message: 'Student not found or unauthorized' })
    }

    // ✅ 4. SANITY CHECK: Only students can have pickup locations
    if (student.role !== 'student') {
      throw createError({ statusCode: 400, message: 'Only students can have pickup locations' })
    }

    // ✅ 5. INPUT SANITIZATION
    const sanitizedAddress = address.trim().substring(0, 500)
    const sanitizedName = locationName.trim().substring(0, 255)
    const sanitizedPlaceId = place_id ? String(place_id).substring(0, 500) : null

    const locationToSave = {
      location_type: 'pickup',
      user_id: studentId,
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
      student_id: studentId,
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

