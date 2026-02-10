/**
 * Public API: Get Customer's Existing Appointments
 * 
 * PURPOSE:
 * Returns a customer's booked appointments to check for conflicts
 * when selecting new appointment times.
 * 
 * SECURITY:
 * - Requires authentication OR valid session
 * - Can only see own appointments
 * - Does not expose other customers' data
 * 
 * USAGE:
 * GET /api/booking/get-customer-appointments?start_date=2026-02-10&end_date=2026-02-28
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

interface CustomerAppointment {
  id: string
  staff_id: string
  staff_name: string
  location_id: string
  location_name: string
  start_time: string
  end_time: string
  duration_minutes: number
  status: string
}

export default defineEventHandler(async (event) => {
  try {
    logger.debug('📅 Get Customer Appointments API called')

    // ============ LAYER 1: AUTHENTICATION ============
    const session = await getUserSession(event)
    
    if (!session?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const userId = session.user.id
    const tenantId = session.user.user_metadata?.tenant_id

    if (!tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Tenant ID required'
      })
    }

    // ============ LAYER 2: VALIDATE INPUT ============
    const query = getQuery(event)
    const startDate = query.start_date as string
    const endDate = query.end_date as string

    if (!startDate || !endDate) {
      throw createError({
        statusCode: 400,
        statusMessage: 'start_date and end_date are required (YYYY-MM-DD format)'
      })
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid date format. Use YYYY-MM-DD'
      })
    }

    // ============ LAYER 3: FETCH CUSTOMER'S APPOINTMENTS ============
    const supabase = getSupabaseAdmin()
    const now = new Date().toISOString()

    // First, find the customer user record by auth_user_id
    const { data: customerData, error: customerError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (customerError || !customerData) {
      logger.warn('⚠️ Customer not found in users table:', userId)
      // Return empty list - customer not yet created as a booking customer
      return {
        success: true,
        appointments: [],
        message: 'No booking profile found'
      }
    }

    const customerId = customerData.id

    // Fetch appointments for this customer
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('id, staff_id, location_id, start_time, end_time, duration_minutes, status')
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'deleted')
      .is('deleted_at', null)
      .gte('start_time', `${startDate}T00:00:00Z`)
      .lte('start_time', `${endDate}T23:59:59Z`)
      .gt('end_time', now) // Only future appointments
      .order('start_time', { ascending: true })

    if (appointmentsError) {
      logger.error('❌ Error fetching customer appointments:', appointmentsError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch customer appointments'
      })
    }

    logger.debug('📅 Found customer appointments:', {
      count: appointments?.length || 0,
      customerId,
      dateRange: `${startDate} to ${endDate}`
    })

    // ============ LAYER 4: ENRICH WITH STAFF & LOCATION NAMES ============
    if (!appointments || appointments.length === 0) {
      return {
        success: true,
        appointments: [],
        count: 0
      }
    }

    const staffIds = [...new Set(appointments.map(a => a.staff_id))]
    const locationIds = [...new Set(appointments.map(a => a.location_id))]

    const [staffData, locationData] = await Promise.all([
      supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', staffIds)
        .then(res => res.data || []),
      supabase
        .from('locations')
        .select('id, name, postal_code')
        .in('id', locationIds)
        .then(res => res.data || [])
    ])

    const staffMap = new Map(staffData.map(s => [s.id, `${s.first_name} ${s.last_name}`]))
    const locationMap = new Map(locationData.map(l => [l.id, l.name]))
    const locationPostalCodeMap = new Map(locationData.map(l => [l.id, l.postal_code]))

    // Enrich appointments
    const enrichedAppointments: CustomerAppointment[] = appointments.map(apt => ({
      id: apt.id,
      staff_id: apt.staff_id,
      staff_name: staffMap.get(apt.staff_id) || 'Unknown Staff',
      location_id: apt.location_id,
      location_name: locationMap.get(apt.location_id) || 'Unknown Location',
      start_time: apt.start_time,
      end_time: apt.end_time,
      duration_minutes: apt.duration_minutes,
      status: apt.status,
      postal_code: locationPostalCodeMap.get(apt.location_id) || undefined
    }))

    logger.debug('✅ Customer appointments enriched:', {
      count: enrichedAppointments.length,
      appointments: enrichedAppointments.map(a => ({
        date: a.start_time.split('T')[0],
        staff: a.staff_name,
        location: a.location_name
      }))
    })

    return {
      success: true,
      appointments: enrichedAppointments,
      count: enrichedAppointments.length
    }

  } catch (error: any) {
    logger.error('❌ Get Customer Appointments API error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch customer appointments'
    })
  }
})
