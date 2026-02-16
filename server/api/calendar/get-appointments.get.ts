import { defineEventHandler, createError, getQuery } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'
import { getAuthenticatedUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('❌ Supabase credentials not configured for get-appointments API')
    throw createError({
      statusCode: 500,
      statusMessage: 'Server configuration error'
    })
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    // Get authenticated user
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    // Get query parameters
    const query = getQuery(event)
    const viewStartDate = query.viewStart ? new Date(query.viewStart as string) : null
    const viewEndDate = query.viewEnd ? new Date(query.viewEnd as string) : null
    const adminStaffFilter = query.adminStaffFilter as string || null

    // Get user's profile
    const { data: userProfile, error: userProfileError } = await serviceSupabase
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userProfileError || !userProfile) {
      logger.warn(`⚠️ User profile not found for auth_user_id: ${authUser.id}`)
      throw createError({ statusCode: 404, statusMessage: 'User profile not found' })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id
    const userRole = userProfile.role

    logger.debug(`🔍 Fetching appointments for user ${userId} with role ${userRole} in tenant ${tenantId}`)

    // Build base query
    let appointmentsQuery = serviceSupabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        type,
        event_type_code,
        status,
        duration_minutes,
        location_id,
        user_id,
        staff_id,
        created_by,
        description,
        tenant_id
      `)
      .is('deleted_at', null)
      .not('status', 'eq', 'cancelled')  // ✅ Filter out cancelled appointments
      .eq('tenant_id', tenantId)
      .order('start_time')

    // Apply date range filter if provided
    if (viewStartDate && viewEndDate) {
      const startISO = viewStartDate.toISOString()
      const endISO = viewEndDate.toISOString()
      
      logger.debug(`📅 Filtering by viewport: ${startISO} to ${endISO}`)
      
      appointmentsQuery = appointmentsQuery
        .gte('start_time', startISO)
        .lt('start_time', endISO)
    } else {
      // Fallback: limit to 1000 if no dates provided
      appointmentsQuery = appointmentsQuery.limit(1000)
    }

    // Apply role-based filters
    if (userRole === 'admin' || userRole === 'tenant_admin' || userRole === 'super_admin') {
      logger.debug(`🔓 Admin/staff role detected - loading appointments for tenant`)
      
      // Admin with staff filter
      if (adminStaffFilter) {
        logger.debug(`📌 Filtering by staff: ${adminStaffFilter}`)
        appointmentsQuery = appointmentsQuery.eq('staff_id', adminStaffFilter)
      }
      // Otherwise, admin sees all tenant appointments (no filter needed)
    } else {
      logger.debug(`👤 Staff role detected - loading only own appointments`)
      appointmentsQuery = appointmentsQuery.eq('staff_id', userId)
    }

    const { data: appointments, error: appointmentsError } = await appointmentsQuery

    if (appointmentsError) {
      logger.error('❌ Error fetching appointments:', appointmentsError)
      throw createError({ statusCode: 500, statusMessage: 'Failed to fetch appointments' })
    }

    logger.debug(`✅ Fetched ${appointments?.length || 0} appointments`)

    // ✅ NEW: Load reserved slots (in-progress bookings) for the same date range
    let reservedSlots: any[] = []
    if (viewStartDate && viewEndDate) {
      const startISO = viewStartDate.toISOString()
      const endISO = viewEndDate.toISOString()
      
      logger.debug(`📅 Loading reserved slots for viewport: ${startISO} to ${endISO}`)
      
      let reservedSlotsQuery = serviceSupabase
        .from('availability_slots')
        .select(`
          id,
          staff_id,
          location_id,
          start_time,
          end_time,
          duration_minutes,
          reserved_by_session,
          reserved_until,
          category_code,
          is_primary_reservation
        `)
        .eq('tenant_id', tenantId)
        .not('reserved_by_session', 'is', null) // Only reserved slots
        .eq('is_primary_reservation', true) // Only load primary reservations
        .gte('reserved_until', new Date().toISOString()) // NEW: Filter out expired reservations
        .gte('start_time', startISO)
        .lt('start_time', endISO)
        .order('start_time')
      
      // Apply staff filter for staff users
      if (userRole !== 'admin' && userRole !== 'tenant_admin' && userRole !== 'super_admin') {
        reservedSlotsQuery = reservedSlotsQuery.eq('staff_id', userId)
      } else if (adminStaffFilter) {
        // Admin with staff filter
        reservedSlotsQuery = reservedSlotsQuery.eq('staff_id', adminStaffFilter)
      }
      
      const { data: slots, error: slotsError } = await reservedSlotsQuery
      
      if (slotsError) {
        logger.warn('⚠️ Error fetching reserved slots:', slotsError)
        // Continue without reserved slots - non-critical
      } else {
        reservedSlots = slots || []
        logger.debug(`✅ Fetched ${reservedSlots.length} reserved slots`)
      }
    }

    // ✅ SECURITY LAYER: Batch-load payment status for appointments
    // Only for appointments that passed all security filters above!
    let paymentsMap: Record<string, any> = {}
    const appointmentIds = (appointments || []).map((apt: any) => apt.id).filter(Boolean)
    
    if (appointmentIds.length > 0) {
      const { data: payments, error: paymentsError } = await serviceSupabase
        .from('payments')
        .select('appointment_id, payment_status, paid_at')
        .in('appointment_id', appointmentIds)  // ✅ Only for pre-filtered appointments
        .eq('tenant_id', tenantId)             // ✅ Defense-in-Depth: Additional tenant isolation
      
      if (paymentsError) {
        logger.warn('⚠️ Error fetching payment data:', paymentsError)
        // Continue without payment data - non-critical
      } else {
        paymentsMap = (payments || []).reduce((map: Record<string, any>, p: any) => {
          map[p.appointment_id] = p
          return map
        }, {})
        
        logger.debug(`✅ Fetched payment status for ${Object.keys(paymentsMap).length} appointments`)
      }
    }

    // Now fetch user data for all user_ids in appointments (batch query)
    const userIds = [...new Set(
      (appointments || [])
        .map((apt: any) => apt.user_id)
        .filter((id: any) => id)
    )] as string[]

    const staffIds = [...new Set(
      (appointments || [])
        .map((apt: any) => apt.staff_id)
        .filter((id: any) => id)
    )] as string[]

    const createdByIds = [...new Set(
      (appointments || [])
        .map((apt: any) => apt.created_by)
        .filter((id: any) => id)
    )] as string[]

    const allUserIds = [...new Set([...userIds, ...staffIds, ...createdByIds])]

    logger.debug(`🔍 Fetching user data for ${allUserIds.length} users`)

    let usersMap: Record<string, any> = {}

    if (allUserIds.length > 0) {
      const { data: users, error: usersError } = await serviceSupabase
        .from('users')
        .select('id, first_name, last_name, category, phone, email')
        .in('id', allUserIds)

      if (usersError) {
        logger.error('❌ Error fetching user data:', usersError)
        // Continue anyway, we'll have null values
      } else {
        usersMap = (users || []).reduce((map: Record<string, any>, user: any) => {
          map[user.id] = user
          return map
        }, {})
        
        logger.debug(`✅ Fetched user data for ${Object.keys(usersMap).length} users`)
      }
    }

    // Fetch location data for appointments with location_id
    const locationIds = [...new Set(
      (appointments || [])
        .map((apt: any) => apt.location_id)
        .filter((id: any) => id)
    )] as string[]

    let locationsMap: Record<string, any> = {}

    if (locationIds.length > 0) {
      const { data: locations, error: locationsError } = await serviceSupabase
        .from('locations')
        .select('id, name, address')
        .in('id', locationIds)

      if (locationsError) {
        logger.warn('⚠️ Error fetching location data:', locationsError)
        // Continue anyway
      } else {
        locationsMap = (locations || []).reduce((map: Record<string, any>, loc: any) => {
          map[loc.id] = loc
          return map
        }, {})
        
        logger.debug(`✅ Fetched location data for ${Object.keys(locationsMap).length} locations`)
      }
    }

    // Enrich appointments with user data and payment status
    const enrichedAppointments = (appointments || []).map((apt: any) => ({
      ...apt,
      user: usersMap[apt.user_id] || null,
      staff: usersMap[apt.staff_id] || null,
      created_by_user: usersMap[apt.created_by] || null,
      location: apt.location_id ? locationsMap[apt.location_id] : null,
      // ✅ ADD: Payment status for visual indication in calendar
      payment_status: paymentsMap[apt.id]?.payment_status || null,
      paid_at: paymentsMap[apt.id]?.paid_at || null
    }))

    // ✅ NEW: Transform reserved slots into calendar events
    const enrichedReservedSlots = (reservedSlots || []).map((slot: any) => ({
      id: `reserved-${slot.id}`, // Prefix to distinguish from appointments
      title: `Reserviert`,
      start_time: slot.start_time,
      end_time: slot.end_time,
      type: 'reserved_slot',
      event_type_code: slot.category_code,
      status: 'reserved',
      duration_minutes: slot.duration_minutes,
      location_id: slot.location_id,
      staff_id: slot.staff_id,
      staff: usersMap[slot.staff_id] || null,
      location: slot.location_id ? locationsMap[slot.location_id] : null,
      reserved_until: slot.reserved_until,
      reserved_by_session: slot.reserved_by_session,
      user: null,
      created_by_user: null,
      payment_status: null,
      paid_at: null,
      classNames: ['reserved-slot-event'] // NEW: Add custom CSS class
    }))

    // Combine appointments and reserved slots
    const allEvents = [...enrichedAppointments, ...enrichedReservedSlots]

    logger.info(`✅ Successfully fetched ${enrichedAppointments.length} appointments + ${enrichedReservedSlots.length} reserved slots`)

    return {
      success: true,
      data: allEvents
    }

  } catch (error: any) {
    logger.error('❌ Error in get-appointments API:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Internal server error'
    })
  }
})

