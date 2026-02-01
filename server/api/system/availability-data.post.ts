import { defineEventHandler, readBody } from 'h3'
import { getServerSession } from '#auth'
import { useSupabaseAdmin } from '~/composables/useSupabaseAdmin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // Authenticate user
    const session = await getServerSession(event)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    // Get Supabase admin
    const supabase = useSupabaseAdmin()

    // Parse request body
    const body = await readBody<{
      action: string
      tenant_id?: string
      category_code?: string
      location_id?: string
      start_date?: string
      end_date?: string
      duration_minutes?: number
      buffer_minutes?: number
    }>(event)

    const { action, tenant_id, category_code, location_id } = body

    if (!action) {
      throw new Error('Missing required field: action')
    }

    logger.debug(`📊 Processing availability action: ${action}`)

    let result

    if (action === 'get-base-data') {
      // Load staff, categories, locations, and availability settings for availability system
      try {
        // Build queries with tenant filtering
        let staffQuery = supabase
          .from('users')
          .select('id, first_name, last_name, role, is_active, category, preferred_location_id, preferred_duration, assigned_staff_ids, tenant_id')
          .eq('role', 'staff')

        let categoriesQuery = supabase
          .from('categories')
          .select('id, code, name, description, lesson_duration_minutes, is_active, tenant_id')
          .eq('is_active', true)

        let locationsQuery = supabase
          .from('locations')
          .select('id, name, address, location_type, is_active, staff_ids, category, time_windows')
          .eq('is_active', true)
          .eq('location_type', 'standard')

        let availabilityQuery = supabase
          .from('staff_availability_settings')
          .select('staff_id, minimum_booking_lead_time_hours')

        // Apply tenant filtering if provided
        if (tenant_id) {
          staffQuery = staffQuery.eq('tenant_id', tenant_id)
          categoriesQuery = categoriesQuery.eq('tenant_id', tenant_id)
        }

        // Load all data in parallel
        const [
          { data: staffData, error: staffError },
          { data: categoriesData, error: categoriesError },
          { data: locationsData, error: locationsError },
          { data: availabilityData, error: availabilityError }
        ] = await Promise.all([
          staffQuery,
          categoriesQuery,
          locationsQuery,
          availabilityQuery
        ])

        if (staffError) throw staffError
        if (categoriesError) throw categoriesError
        if (locationsError) throw locationsError
        if (availabilityError) {
          console.warn('⚠️ Could not load availability settings:', availabilityError)
        }

        // Enrich staff data with minimum_booking_lead_time_hours
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
      // Load staff working hours
      try {
        const staffIds = body.staff_ids as string[]
        if (!staffIds || staffIds.length === 0) {
          return {
            success: true,
            data: {
              workingHours: []
            }
          }
        }

        const { data: workingHours, error } = await supabase
          .from('staff_working_hours')
          .select('id, staff_id, day_of_week, start_time, end_time, is_active')
          .in('staff_id', staffIds)
          .eq('is_active', true)

        if (error) throw error

        result = {
          success: true,
          data: {
            workingHours: workingHours || []
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to load working hours: ${err.message}`)
      }
    } else if (action === 'get-categories-for-tenant') {
      // Load categories for a specific tenant
      try {
        if (!tenant_id) {
          throw new Error('Missing required field: tenant_id')
        }

        let query = supabase.from('categories').select('*')

        if (tenant_id) {
          query = query.eq('tenant_id', tenant_id)
        } else {
          query = query.is('tenant_id', null)
        }

        const { data: categories, error } = await query.order('code', { ascending: true })

        if (error) throw error

        result = {
          success: true,
          data: {
            categories: categories || []
          }
        }
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
