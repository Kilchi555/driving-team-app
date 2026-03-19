import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

/**
 * Exam locations are stored as GLOBAL entries (tenant_id = null).
 * Staff membership is tracked via the staff_ids array on the global entry.
 * We NEVER create tenant-specific duplicates.
 */

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { action, data } = body

  if (!action) {
    throw createError({
      statusCode: 400,
      message: 'action is required (loadAllLocations, loadSelectedLocations, addLocation, removeLocation)'
    })
  }

  const supabase = getSupabaseAdmin()

  try {
    // ─── loadAllLocations ─────────────────────────────────────────────────────
    if (action === 'loadAllLocations') {
      const { data: locations, error } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'exam')
        .is('tenant_id', null)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return { success: true, data: locations || [] }

    // ─── loadSelectedLocations ────────────────────────────────────────────────
    } else if (action === 'loadSelectedLocations') {
      const { staffId } = data

      if (!staffId) {
        throw createError({ statusCode: 400, message: 'staffId is required' })
      }

      // Only look at global entries – filter by staff_ids
      const { data: allExamLocs, error } = await supabase
        .from('locations')
        .select('*')
        .eq('location_type', 'exam')
        .is('tenant_id', null)
        .eq('is_active', true)

      if (error) throw error

      const staffLocations = (allExamLocs || []).filter((loc: any) => {
        const staffIds = loc.staff_ids || []
        return Array.isArray(staffIds) && staffIds.includes(staffId)
      })

      logger.debug('✅ Loaded selected locations for staff:', staffId, 'count:', staffLocations.length)
      return { success: true, data: staffLocations }

    // ─── addLocation ──────────────────────────────────────────────────────────
    } else if (action === 'addLocation') {
      const { authUserId, staffId, location } = data

      if (!authUserId || !staffId || !location) {
        throw createError({ statusCode: 400, message: 'authUserId, staffId, and location are required' })
      }

      // Find the global entry (tenant_id = null) by name+address
      const { data: globalLocation, error: findError } = await supabase
        .from('locations')
        .select('*')
        .eq('name', location.name)
        .eq('address', location.address)
        .eq('location_type', 'exam')
        .is('tenant_id', null)
        .maybeSingle()

      if (findError) throw findError

      if (globalLocation) {
        // Add staffId to staff_ids array on the global entry
        const staffIds = Array.isArray(globalLocation.staff_ids) ? [...globalLocation.staff_ids] : []
        if (!staffIds.includes(staffId)) {
          staffIds.push(staffId)
          const { error: updateError } = await supabase
            .from('locations')
            .update({ staff_ids: staffIds })
            .eq('id', globalLocation.id)
          if (updateError) throw updateError
        }
      } else {
        // No global entry exists yet → create one (no tenant_id)
        const { error: insertError } = await supabase
          .from('locations')
          .insert({
            staff_ids: [staffId],
            tenant_id: null,
            name: location.name,
            address: location.address,
            city: location.city || null,
            postal_code: location.postal_code || null,
            canton: location.canton || null,
            location_type: 'exam',
            is_active: true,
            google_place_id: location.google_place_id || null
          })
        if (insertError) throw insertError
      }

      return { success: true, message: 'Location added successfully' }

    // ─── removeLocation ───────────────────────────────────────────────────────
    } else if (action === 'removeLocation') {
      const { authUserId, staffId, location } = data

      if (!authUserId || !staffId || !location) {
        throw createError({ statusCode: 400, message: 'authUserId, staffId, and location are required' })
      }

      // Find the global entry
      const { data: globalLocation, error: findError } = await supabase
        .from('locations')
        .select('*')
        .eq('name', location.name)
        .eq('address', location.address)
        .eq('location_type', 'exam')
        .is('tenant_id', null)
        .maybeSingle()

      if (findError) throw findError

      if (globalLocation) {
        const staffIds = (globalLocation.staff_ids || []).filter((id: string) => id !== staffId)
        // Global entries are never deleted – just update staff_ids
        const { error: updateError } = await supabase
          .from('locations')
          .update({ staff_ids: staffIds })
          .eq('id', globalLocation.id)
        if (updateError) throw updateError
      }

      return { success: true, message: 'Location removed successfully' }

    } else {
      throw createError({
        statusCode: 400,
        message: 'Invalid action. Use: loadAllLocations, loadSelectedLocations, addLocation, or removeLocation'
      })
    }
  } catch (err: any) {
    logger.error('❌ Exam locations API error:', err.message)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to manage exam locations'
    })
  }
})
