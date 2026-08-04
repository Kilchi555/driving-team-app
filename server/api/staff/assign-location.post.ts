/**
 * Atomically assign / unassign a staff member to a location.
 *
 * Keeps locations.staff_ids and staff_locations in sync — booking only
 * shows locations that have an active, online-bookable staff_locations row.
 *
 * POST /api/staff/assign-location
 * Body: {
 *   action: 'assign' | 'unassign'
 *   location_id: string
 *   staff_id?: string              // optional; defaults to caller (admin may set other staff)
 *   is_online_bookable?: boolean   // assign only, default false
 *   available_categories?: string[]
 * }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

interface AssignLocationRequest {
  action: 'assign' | 'unassign'
  location_id: string
  staff_id?: string
  is_online_bookable?: boolean
  available_categories?: string[] | null
}

function normalizeCategories(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined
  return [...new Set(input.map((c) => String(c).trim()).filter(Boolean))]
}

function parseStaffIds(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  }
  return []
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as AssignLocationRequest
    const { action, location_id, staff_id: requestedStaffId, is_online_bookable = false } = body || {} as AssignLocationRequest
    const available_categories = normalizeCategories(body?.available_categories)

    if (!action || !['assign', 'unassign'].includes(action)) {
      throw createError({ statusCode: 400, statusMessage: 'action must be assign or unassign' })
    }
    if (!location_id || typeof location_id !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'location_id is required' })
    }

    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
    }

    const supabase = getSupabaseAdmin()

    const { data: caller, error: callerError } = await supabase
      .from('users')
      .select('id, tenant_id, role, admin_level')
      .eq('auth_user_id', authUser.id)
      .single()

    if (callerError || !caller) {
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(caller.role)
      || caller.admin_level != null

    const targetStaffId = requestedStaffId || caller.id

    if (targetStaffId !== caller.id && !isAdmin) {
      throw createError({ statusCode: 403, statusMessage: 'Only admins can assign locations for other staff' })
    }

    // Ensure target staff belongs to same tenant
    const { data: targetStaff, error: targetError } = await supabase
      .from('users')
      .select('id, tenant_id, category, is_active, role')
      .eq('id', targetStaffId)
      .single()

    if (targetError || !targetStaff) {
      throw createError({ statusCode: 404, statusMessage: 'Target staff not found' })
    }
    if (targetStaff.tenant_id !== caller.tenant_id) {
      throw createError({ statusCode: 403, statusMessage: 'Staff belongs to a different tenant' })
    }

    const { data: location, error: locationError } = await supabase
      .from('locations')
      .select('id, tenant_id, staff_ids, available_categories, location_type, is_active')
      .eq('id', location_id)
      .eq('tenant_id', caller.tenant_id)
      .single()

    if (locationError || !location) {
      throw createError({ statusCode: 404, statusMessage: 'Location not found' })
    }

    const currentStaffIds = parseStaffIds(location.staff_ids)

    if (action === 'assign') {
      const nextStaffIds = currentStaffIds.includes(targetStaffId)
        ? currentStaffIds
        : [...currentStaffIds, targetStaffId]

      // Resolve categories: explicit > staff profile ∩ location > staff profile
      let categories = available_categories
      if (categories === undefined) {
        let staffCats: string[] = []
        const raw = targetStaff.category
        if (Array.isArray(raw)) staffCats = raw.map(String)
        else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) staffCats = parsed.map(String)
          } catch { /* ignore */ }
        }
        const locCats = Array.isArray(location.available_categories) ? location.available_categories.map(String) : []
        categories = locCats.length > 0
          ? staffCats.filter((c) => locCats.includes(c))
          : staffCats
      }

      const { error: locUpdateError } = await supabase
        .from('locations')
        .update({ staff_ids: nextStaffIds })
        .eq('id', location_id)
        .eq('tenant_id', caller.tenant_id)

      if (locUpdateError) {
        logger.error('❌ Failed to update locations.staff_ids:', locUpdateError)
        throw createError({ statusCode: 500, statusMessage: 'Failed to update location staff assignment' })
      }

      const { error: slError } = await supabase
        .from('staff_locations')
        .upsert({
          staff_id: targetStaffId,
          location_id,
          tenant_id: caller.tenant_id,
          is_active: true,
          is_online_bookable: !!is_online_bookable,
          available_categories: categories,
          updated_at: new Date().toISOString()
        }, { onConflict: 'staff_id,location_id,tenant_id' })

      if (slError) {
        // Roll back staff_ids so we never leave a half-written assignment
        logger.error('❌ Failed to upsert staff_locations, rolling back staff_ids:', slError)
        await supabase
          .from('locations')
          .update({ staff_ids: currentStaffIds })
          .eq('id', location_id)
          .eq('tenant_id', caller.tenant_id)
        throw createError({ statusCode: 500, statusMessage: 'Failed to create staff location assignment' })
      }

      logger.debug('✅ Staff assigned to location', {
        staff_id: targetStaffId,
        location_id,
        is_online_bookable: !!is_online_bookable,
        available_categories: categories
      })

      return {
        success: true,
        action: 'assign',
        location_id,
        staff_id: targetStaffId,
        staff_ids: nextStaffIds,
        is_online_bookable: !!is_online_bookable,
        available_categories: categories
      }
    }

    // unassign
    const nextStaffIds = currentStaffIds.filter((id) => id !== targetStaffId)

    const { error: locUpdateError } = await supabase
      .from('locations')
      .update({ staff_ids: nextStaffIds })
      .eq('id', location_id)
      .eq('tenant_id', caller.tenant_id)

    if (locUpdateError) {
      logger.error('❌ Failed to remove staff from locations.staff_ids:', locUpdateError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to update location staff assignment' })
    }

    const { error: slError } = await supabase
      .from('staff_locations')
      .update({
        is_active: false,
        is_online_bookable: false,
        updated_at: new Date().toISOString()
      })
      .eq('staff_id', targetStaffId)
      .eq('location_id', location_id)
      .eq('tenant_id', caller.tenant_id)

    if (slError) {
      logger.error('❌ Failed to deactivate staff_locations, rolling back staff_ids:', slError)
      await supabase
        .from('locations')
        .update({ staff_ids: currentStaffIds })
        .eq('id', location_id)
        .eq('tenant_id', caller.tenant_id)
      throw createError({ statusCode: 500, statusMessage: 'Failed to deactivate staff location assignment' })
    }

    logger.debug('✅ Staff unassigned from location', { staff_id: targetStaffId, location_id })

    return {
      success: true,
      action: 'unassign',
      location_id,
      staff_id: targetStaffId,
      staff_ids: nextStaffIds
    }
  } catch (error: any) {
    logger.error('❌ Error in assign-location:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to assign location'
    })
  }
})
