import { defineEventHandler, readBody, createError } from 'h3'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { action, data } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required (loadAllLocations, loadSelectedLocations, addLocation, removeLocation)'
    })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  try {
    if (action === 'loadAllLocations') {
      // Load all global exam locations (no tenant filtering)
      const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'exam')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      return {
        success: true,
        data: locations || []
      }
    } else if (action === 'loadSelectedLocations') {
      const { staffId } = data

      if (!staffId) {
        throw createError({
          statusCode: 400,
          message: 'staffId is required'
        })
      }

      // Load all exam locations
      const { data: allExamLocs, error } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'exam')
        .eq('is_active', true)

      if (error) throw error

      // Filter: only locations where staffId is in staff_ids
      const staffLocations = (allExamLocs || []).filter((loc: any) => {
        const staffIds = loc.staff_ids || []
        return Array.isArray(staffIds) && staffIds.includes(staffId)
      })

      return {
        success: true,
        data: staffLocations || []
      }
    } else if (action === 'addLocation') {
      const { authUserId, staffId, location } = data

      if (!authUserId || !staffId || !location) {
        throw createError({
          statusCode: 400,
          message: 'authUserId, staffId, and location are required'
        })
      }

      // Get current user's tenant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUserId)
        .single()

      if (userError) {
        throw createError({
          statusCode: 404,
          message: 'User not found'
        })
      }

      const tenantId = userData?.tenant_id

      // Check if location already exists in this tenant
      const { data: existingLocation, error: findError } = await supabase
        .from('locations')
        .select('*')
        .eq('name', location.name)
        .eq('address', location.address)
        .eq('location_type', 'exam')
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (findError) throw findError

      if (existingLocation) {
        // Location exists → Add staffId to staff_ids array if not already present
        const staffIds = Array.isArray(existingLocation.staff_ids)
          ? [...existingLocation.staff_ids]
          : []

        if (!staffIds.includes(staffId)) {
          staffIds.push(staffId)

          const { error: updateError } = await supabase
            .from('locations')
            .update({ staff_ids: staffIds })
            .eq('id', existingLocation.id)

          if (updateError) throw updateError
        }
      } else {
        // Location doesn't exist → Create new one with tenant_id
        const { error: insertError } = await supabase
          .from('locations')
          .insert({
            staff_ids: [staffId],
            tenant_id: tenantId,
            name: location.name,
            address: location.address,
            city: location.city,
            postal_code: location.postal_code,
            canton: location.canton,
            location_type: 'exam',
            is_active: true,
            google_place_id: location.google_place_id || null
          })

        if (insertError) throw insertError
      }

      return {
        success: true,
        message: 'Location added successfully'
      }
    } else if (action === 'removeLocation') {
      const { authUserId, staffId, location } = data

      if (!authUserId || !staffId || !location) {
        throw createError({
          statusCode: 400,
          message: 'authUserId, staffId, and location are required'
        })
      }

      // Get current user's tenant
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_user_id', authUserId)
        .single()

      if (userError) {
        throw createError({
          statusCode: 404,
          message: 'User not found'
        })
      }

      const tenantId = userData?.tenant_id

      // Find the location in this tenant
      const { data: locationsToUpdate, error: findError } = await supabase
        .from('locations')
        .select('*')
        .eq('name', location.name)
        .eq('address', location.address)
        .eq('location_type', 'exam')
        .eq('tenant_id', tenantId)

      if (findError) throw findError

      // Update staff_ids array
      for (const loc of locationsToUpdate || []) {
        const staffIds = (loc.staff_ids || []).filter((id: string) => id !== staffId)

        // If no staff left, delete the location; otherwise update staff_ids
        if (staffIds.length === 0) {
          await supabase.from('locations').delete().eq('id', loc.id)
        } else {
          await supabase
            .from('locations')
            .update({ staff_ids: staffIds })
            .eq('id', loc.id)
        }
      }

      return {
        success: true,
        message: 'Location removed successfully'
      }
    } else {
      throw createError({
        statusCode: 400,
        message:
          'Invalid action. Use: loadAllLocations, loadSelectedLocations, addLocation, or removeLocation'
      })
    }
  } catch (err: any) {
    console.error('❌ Exam locations API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to manage exam locations'
    })
  }
})
