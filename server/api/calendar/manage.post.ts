// server/api/calendar/manage.post.ts
// Consolidated calendar management endpoint
// Handles all calendar-related operations from CalendarComponent.vue
// Actions: get-staff-meetings, create-appointment, update-appointment-status,
//         get-existing-appointments, get-pricing-rules, get-user-data, get-staff-data,
//         create-payment, get-payment, get-tenant-data

import { defineEventHandler, readBody, createError } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
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

  try {
    logger.debug('📋 Calendar API action:', action)
    
    if (action === 'get-staff-meetings') {
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
      // Create a new appointment
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert([appointment_data])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: appointment
      }
    }

    if (action === 'update-appointment-status') {
      // Update appointment status
      const { data: updated, error } = await supabase
        .from('appointments')
        .update(appointment_data)
        .eq('id', appointment_data.id)
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: updated
      }
    }

    if (action === 'get-existing-appointments') {
      // Get existing appointments for conflict checking
      logger.debug('🔍 Getting existing appointments:', { staff_id, start_date, end_date })
      
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('staff_id', staff_id)
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
      // Create payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert([payment_data])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: payment
      }
    }

    if (action === 'get-payment') {
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
    logger.error('❌ Calendar API error:', err.message || err)
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || 'Calendar operation failed'
    })
  }
})
