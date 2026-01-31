import { defineEventHandler, createError, getQuery } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { createClient } from '@supabase/supabase-js'
import { logger } from '~/utils/logger'

/**
 * ✅ GET /api/staff/get-appointment-payment
 * 
 * Secure API to fetch complete payment details for an appointment
 * Used in PriceDisplay component for showing existing payment info
 * 
 * Query Params:
 *   - appointmentId: Appointment ID (required)
 * 
 * Returns:
 *   - Full payment data with related company_billing_address and credit_transaction
 * 
 * Security Layers:
 *   1. Authentication (HTTP-Only Cookie)
 *   2. Tenant Isolation
 *   3. Ownership Check (user must be staff for this appointment)
 */

export default defineEventHandler(async (event) => {
  try {
    // ✅ LAYER 1: AUTHENTICATION
    const authUser = await getAuthenticatedUser(event)
    if (!authUser) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      })
    }

    // ✅ LAYER 2: Get user profile and tenant
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, role')
      .eq('auth_user_id', authUser.id)
      .single()

    if (userError || !userProfile) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User profile not found'
      })
    }

    const tenantId = userProfile.tenant_id
    const userId = userProfile.id

    // ✅ LAYER 3: INPUT VALIDATION
    const query = getQuery(event)
    const appointmentId = query.appointmentId as string | undefined

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment ID is required'
      })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appointmentId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid appointment ID format'
      })
    }

    // ✅ LAYER 4: Verify appointment exists and user has access
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from('appointments')
      .select('id, staff_id, tenant_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn(`⚠️ Appointment not found or access denied: ${appointmentId}`)
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // ✅ LAYER 5: Permission check - only staff assigned to this appointment or admin
    const isAdmin = ['admin', 'tenant_admin', 'super_admin'].includes(userProfile.role)
    const isStaffForAppointment = appointment.staff_id === userId
    
    if (!isAdmin && !isStaffForAppointment) {
      logger.warn(`🚫 User ${userId} attempted to access appointment ${appointmentId} they don't own`)
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    // ✅ LAYER 6: Fetch payment data with relations
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        appointment_id,
        user_id,
        staff_id,
        lesson_price_rappen,
        admin_fee_rappen,
        products_price_rappen,
        discount_amount_rappen,
        total_amount_rappen,
        payment_method,
        payment_status,
        currency,
        description,
        created_at,
        updated_at,
        metadata,
        paid_at,
        refunded_at,
        invoice_number,
        invoice_address,
        due_date,
        created_by,
        notes,
        company_billing_address_id,
        credit_used_rappen,
        credit_transaction_id,
        tenant_id,
        wallee_transaction_id,
        last_reminder_sent_at,
        last_reminder_stage,
        automatic_payment_consent,
        automatic_payment_consent_at,
        scheduled_payment_date,
        payment_method_id,
        automatic_payment_processed,
        automatic_payment_processed_at,
        scheduled_authorization_date,
        first_reminder_sent_at,
        reminder_count,
        stripe_session_id,
        payment_provider,
        updated_by,
        course_registration_id,
        company_billing_address:company_billing_addresses!company_billing_address_id (
          id,
          company_name,
          contact_person,
          email,
          phone,
          street,
          street_number,
          zip,
          city,
          country,
          vat_number,
          notes
        ),
        credit_transaction:credit_transactions!credit_transaction_id (
          id,
          amount_rappen,
          transaction_type,
          notes
        )
      `)
      .eq('appointment_id', appointmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (paymentError) {
      logger.warn('⚠️ Error fetching payment:', paymentError)
      // Continue with null - payment may not exist
    }

    logger.debug('✅ Appointment payment data retrieved:', {
      appointmentId: appointmentId,
      hasPayment: !!paymentData,
      paymentStatus: paymentData?.payment_status || null
    })

    return {
      success: true,
      data: paymentData || null
    }

  } catch (error: any) {
    logger.error('❌ Staff get-appointment-payment API error:', error)

    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch payment data'
    })
  }
})
