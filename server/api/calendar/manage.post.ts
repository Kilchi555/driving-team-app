// server/api/calendar/manage.post.ts
// Consolidated calendar management endpoint
// Handles all calendar-related operations from CalendarComponent.vue
// Actions: get-staff-meetings, create-appointment, update-appointment-status,
//         get-existing-appointments, get-pricing-rules, get-user-data, get-staff-data,
//         create-payment, get-payment, get-tenant-data

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  try {
    // ============ LAYER 1: AUTHENTICATION (Server-side) ============
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    const body = await readBody(event)
    const { 
      action,
      tenant_id,
      staff_id,
      user_id,
      appointment_data,
      payment_data,
      start_date,
      end_date,
      category
    } = body

    const supabase = getSupabaseAdmin()

    // ============ Get user profile (from authenticated user) ============
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, role, tenant_id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User profile not found'
      })
    }

    logger.debug('📋 Calendar API action:', action, 'by user:', userProfile.id)
    
    if (action === 'get-staff-meetings') {
      // ✅ Verify tenant access
      if (tenant_id !== userProfile.tenant_id) {
        logger.warn('⚠️ Unauthorized tenant access attempt', {
          requestedTenant: tenant_id,
          userTenant: userProfile.tenant_id
        })
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Get all staff meetings for a tenant/staff
      const { data: meetings, error } = await supabase
        .from('staff_meetings')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('staff_id', staff_id)

      if (error) throw error

      return {
        success: true,
        data: meetings || []
      }
    }

    if (action === 'create-appointment') {
      // ✅ Verify tenant access
      if (appointment_data?.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Create a new appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([appointment_data])
        .select()
        .single()

      if (error) throw error

      logger.info('📅 Appointment created', { appointmentId: appointment.id })

      return {
        success: true,
        data: appointment
      }
    }

    if (action === 'update-appointment-status') {
      // ✅ Verify user owns appointment
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('id, staff_id, tenant_id, start_time, end_time')
        .eq('id', appointment_data.id)
        .single()

      if (aptError || !apt) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Appointment not found'
        })
      }

      if (apt.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this appointment'
        })
      }

      // Check if time changed
      const timeChanged = apt.start_time !== appointment_data.start_time ||
                         apt.end_time !== appointment_data.end_time
      
      logger.debug('🔍 DEBUG update-appointment-status:', {
        appointmentId: appointment_data.id,
        oldStart: apt.start_time,
        newStart: appointment_data.start_time,
        oldEnd: apt.end_time,
        newEnd: appointment_data.end_time,
        timeChanged
      })

      // Update appointment status
      const { data: updated, error } = await supabase
        .from('appointments')
        .update(appointment_data)
        .eq('id', appointment_data.id)
        .select()
        .single()

      if (error) throw error

      logger.info('📅 Appointment updated', { appointmentId: appointment_data.id })

      // ✅ NEW: Queue availability recalculation if time changed
      if (timeChanged) {
        try {
          logger.debug('📋 Queuing availability recalculation after appointment update...', {
            staffId: apt.staff_id,
            tenantId: apt.tenant_id
          })
          await $fetch('/api/availability/queue-recalc', {
            method: 'POST',
            body: {
              staff_id: apt.staff_id,
              tenant_id: apt.tenant_id,
              trigger: 'appointment_edit'
            }
          })
          logger.debug('✅ Queued recalculation after appointment update')
        } catch (queueError: any) {
          logger.warn('⚠️ Failed to queue recalculation (non-critical):', queueError.message)
        }
      } else {
        logger.debug('ℹ️ Time unchanged - no queue needed')
      }

      return {
        success: true,
        data: updated
      }
    }

    if (action === 'get-existing-appointments') {
      // ✅ Verify tenant access
      if (tenant_id && tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Get existing appointments for conflict checking
      logger.debug('🔍 Getting existing appointments:', { staff_id, start_date, end_date })
      
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('staff_id', staff_id)
        .eq('tenant_id', userProfile.tenant_id)
        .neq('status', 'cancelled')
      
      // ✅ Only add date filters if they're provided
      if (start_date) {
        query = query.gte('start_time', start_date)
      }
      if (end_date) {
        query = query.lte('end_time', end_date)
      }
      
      const { data: appointments, error } = await query

      if (error) {
        logger.error('❌ Error fetching appointments:', error)
        throw error
      }

      logger.debug('✅ Appointments fetched:', appointments?.length || 0)
      return {
        success: true,
        data: appointments || []
      }
    }

    if (action === 'get-pricing-rules') {
      // ✅ Verify tenant access
      if (tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Get pricing rules for appointment
      logger.debug('📊 Getting pricing rules for category:', category)
      
      let query = supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', tenant_id)
      
      // ✅ Filter by category_code if provided (note: column is category_code, not category)
      if (category) {
        query = query.eq('category_code', category)
      }
      
      const { data: rules, error } = await query

      if (error) {
        logger.error('❌ Error fetching pricing rules:', error)
        throw error
      }

      logger.debug('✅ Pricing rules fetched:', rules?.length || 0)
      return {
        success: true,
        data: rules || []
      }
    }

    if (action === 'get-user-data') {
      // ✅ Verify user owns the requested user data or is admin
      const { data: requestedUser, error: userDataError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user_id)
        .single()

      if (userDataError || !requestedUser) {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found'
        })
      }

      if (requestedUser.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this user'
        })
      }

      // Get user data
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user_id)
        .single()

      if (error) throw error

      return {
        success: true,
        data: user
      }
    }

    if (action === 'get-staff-data') {
      // ✅ Verify tenant access
      const { data: staffData, error: staffDataError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', staff_id)
        .single()

      if (staffDataError || !staffData) {
        throw createError({
          statusCode: 404,
          statusMessage: 'Staff not found'
        })
      }

      if (staffData.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this staff'
        })
      }

      // Get staff data
      const { data: staff, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', staff_id)
        .eq('role', 'staff')
        .single()

      if (error) throw error

      return {
        success: true,
        data: staff
      }
    }

    if (action === 'create-payment') {
      // ✅ Verify tenant access
      if (payment_data?.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([payment_data])
        .select()
        .single()

      if (error) throw error

      logger.info('💳 Payment created', { paymentId: payment.id })

      return {
        success: true,
        data: payment
      }
    }

    if (action === 'get-payment') {
      // ✅ Verify appointment ownership before fetching payment
      const { data: apt, error: aptError } = await supabase
        .from('appointments')
        .select('tenant_id')
        .eq('id', payment_data?.appointment_id)
        .single()

      if (aptError || !apt) {
        return {
          success: true,
          data: null
        }
      }

      if (apt.tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this payment'
        })
      }

      // Get payment record by appointment_id
      logger.debug('💳 Getting payment for appointment:', payment_data?.appointment_id)
      
      // ✅ FIXED: Use appointment_id, not id
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('appointment_id', payment_data?.appointment_id)
        .single()

      if (error) {
        logger.warn('⚠️ Payment not found:', error.message)
        return {
          success: true,
          data: null
        }
      }

      logger.debug('✅ Payment found:', payment?.id)
      return {
        success: true,
        data: payment
      }
    }

    if (action === 'get-tenant-data') {
      // ✅ Verify tenant access
      if (tenant_id !== userProfile.tenant_id) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Access denied to this tenant'
        })
      }

      // Get tenant data
      const { data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenant_id)
        .single()

      if (error) throw error

      return {
        success: true,
        data: tenant
      }
    }

    throw createError({
      statusCode: 400,
      statusMessage: `Unknown action: ${action}`
    })

  } catch (err: any) {
    logger.error('❌ Calendar API error:', {
      action,
      error: err.message,
      statusCode: err.statusCode
    })
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Calendar operation failed'
    })
  }
})
