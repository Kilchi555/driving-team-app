import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ✅ SECURITY: Requires authenticated staff/admin user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

    const supabase = getSupabaseAdmin()

    const { data: profile } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (!profile || !['staff', 'admin', 'super_admin'].includes(profile.role)) {
      throw createError({ statusCode: 403, statusMessage: 'Staff/Admin access required' })
    }

    const body = await readBody<{
      action: string
      tenant_id?: string
      category_code?: string
      location_id?: string
      start_date?: string
      end_date?: string
      duration_minutes?: number
      buffer_minutes?: number
      staff_ids?: string[]
    }>(event)

    const { action } = body

    // ✅ SECURITY: Enforce tenant scoping – super_admin may pass tenant_id, others
    // are restricted to their own tenant.
    const effectiveTenantId = profile.role === 'super_admin'
      ? (body.tenant_id ?? profile.tenant_id)
      : profile.tenant_id

    if (!action) {
      throw new Error('Missing required field: action')
    }

    logger.debug(`📊 Processing availability action: ${action}`)

    let result

    if (action === 'get-base-data') {
      try {
        const [
          { data: staffData, error: staffError },
          { data: categoriesData, error: categoriesError },
          { data: locationsData, error: locationsError },
          { data: availabilityData, error: availabilityError }
        ] = await Promise.all([
          supabase
            .from('users')
            .select('id, first_name, last_name, role, is_active, category, preferred_location_id, preferred_duration, assigned_staff_ids, tenant_id')
            .eq('role', 'staff')
            .eq('tenant_id', effectiveTenantId),

          supabase
            .from('categories')
            .select('id, code, name, description, lesson_duration_minutes, is_active, tenant_id')
            .eq('is_active', true)
            .eq('tenant_id', effectiveTenantId),

          // ✅ FIX SRK-03: tenant_id filter was missing
          supabase
            .from('locations')
            .select('id, name, address, location_type, is_active, staff_ids, category, time_windows')
            .eq('is_active', true)
            .eq('location_type', 'standard')
            .eq('tenant_id', effectiveTenantId),

          // ✅ FIX SRK-03: scoped via staff_id join – only staff of this tenant
          supabase
            .from('staff_availability_settings')
            .select('staff_id, minimum_booking_lead_time_hours')
            .in(
              'staff_id',
              supabase
                .from('users')
                .select('id')
                .eq('role', 'staff')
                .eq('tenant_id', effectiveTenantId)
            )
        ])

        if (staffError) throw staffError
        if (categoriesError) throw categoriesError
        if (locationsError) throw locationsError
        if (availabilityError) {
          console.warn('⚠️ Could not load availability settings:', availabilityError)
        }

        const enrichedStaff = (staffData || []).map((staff: any) => {
          const availability = availabilityData?.find((a: any) => a.staff_id === staff.id)
          return {
            ...staff,
            minimum_booking_lead_time_hours: availability?.minimum_booking_lead_time_hours || 24
          }
        })

        result = {
          success: true,
          data: {
            staff: enrichedStaff,
            categories: categoriesData || [],
            locations: locationsData || [],
            availability: availabilityData || []
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to load base data: ${err.message}`)
      }
    } else if (action === 'get-working-hours') {
      try {
        const staffIds = body.staff_ids
        if (!staffIds || staffIds.length === 0) {
          return { success: true, data: { workingHours: [] } }
        }

        // ✅ SECURITY: Verify all requested staff_ids belong to the caller's tenant
        const { data: ownedStaff } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'staff')
          .eq('tenant_id', effectiveTenantId)
          .in('id', staffIds)

        const safeStaffIds = (ownedStaff ?? []).map((s: any) => s.id)

        if (safeStaffIds.length === 0) {
          return { success: true, data: { workingHours: [] } }
        }

        const { data: workingHours, error } = await supabase
          .from('staff_working_hours')
          .select('id, staff_id, day_of_week, start_time, end_time, is_active')
          .in('staff_id', safeStaffIds)
          .eq('is_active', true)

        if (error) throw error

        result = { success: true, data: { workingHours: workingHours || [] } }
      } catch (err: any) {
        throw new Error(`Failed to load working hours: ${err.message}`)
      }
    } else if (action === 'get-categories-for-tenant') {
      try {
        const { data: categories, error } = await supabase
          .from('categories')
          .select('*')
          .eq('tenant_id', effectiveTenantId)
          .order('code', { ascending: true })

        if (error) throw error

        result = { success: true, data: { categories: categories || [] } }
      } catch (err: any) {
        throw new Error(`Failed to load categories: ${err.message}`)
      }
    } else {
      throw new Error(`Invalid action: ${action}`)
    }

    logger.debug(`✅ Availability system action successful: ${action}`)
    return result
  } catch (err: any) {
    logger.error('❌ Error in availability endpoint:', err)
    throw createError({
      statusCode: err.statusCode || 400,
      statusMessage: err.message || `Failed to process availability request`
    })
  }
})
