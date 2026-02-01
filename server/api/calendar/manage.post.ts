// server/api/calendar/manage.post.ts
// Consolidated calendar management endpoint
// Handles all calendar-related operations from CalendarComponent.vue
// Actions: get-staff-meetings, create-appointment, update-appointment-status,
//         get-existing-appointments, get-pricing-rules, get-user-data, get-staff-data,
//         create-payment, get-payment, get-tenant-data

import { defineEventHandler, readBody, createError } from 'h3'
import { serverSupabaseClient } from '#supabase/server'

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
    end_date
  } = body

  const supabase = serverSupabaseClient(event)

  try {
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
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('staff_id', staff_id)
        .gte('start_time', start_date)
        .lte('end_time', end_date)
        .neq('status', 'cancelled')

      if (error) throw error

      return {
        success: true,
        data: appointments || []
      }
    }

    if (action === 'get-pricing-rules') {
      // Get pricing rules for appointment
      const { data: rules, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('tenant_id', tenant_id)

      if (error) throw error

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
      // Get payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', payment_data?.id)
        .single()

      if (error) throw error

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
      message: `Unknown action: ${action}`
    })

  } catch (err: any) {
    console.error('❌ Calendar API error:', err)
    throw createError({
      statusCode: err.statusCode || 500,
      message: err.message || 'Calendar operation failed'
    })
  }
})
