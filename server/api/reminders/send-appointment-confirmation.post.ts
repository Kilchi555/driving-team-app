// ============================================
// Send Appointment Confirmation Email
// ============================================
// Sendet die Bestätigungs-Email sofort nach Termin-Erstellung
// Mit Bestätigungs-Link und Zahlungsdetails

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://simy.ch').replace(/\/$/, '')

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { appointmentId, userId, tenantId } = body

    if (!appointmentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, userId, tenantId'
      })
    }

    logger.debug('📧 Sending appointment confirmation email:', { appointmentId, userId, tenantId })

    const supabase = getSupabaseAdmin()

    // 1. Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone, onboarding_status')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      logger.warn('⚠️ User not found:', userId)
      return {
        success: true,
        skipped: true,
        reason: 'user_not_found',
        message: 'User not found, skipping email'
      }
    }

    // 2. Check if user has email
    if (!user.email || user.email.trim() === '') {
      logger.debug('⏭️ User has no email yet, skipping appointment confirmation')
      return {
        success: true,
        skipped: true,
        reason: 'user_email_missing',
        message: 'User has no email, skipping confirmation'
      }
    }

    // 3. Check if user is still in onboarding
    if (user.onboarding_status === 'pending') {
      logger.debug('⏭️ User is still in onboarding, skipping appointment confirmation')
      return {
        success: true,
        skipped: true,
        reason: 'user_onboarding_pending',
        message: 'User onboarding pending, will send after completion'
      }
    }

    // 4. Get appointment data with payment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        staff_id,
        confirmation_token,
        location_id,
        payments (
          id,
          total_amount_rappen,
          lesson_price_rappen,
          admin_fee_rappen,
          products_price_rappen,
          discount_amount_rappen,
          payment_status
        )
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      logger.warn('⚠️ Appointment not found:', appointmentError)
      return {
        success: true,
        skipped: true,
        reason: 'appointment_not_found',
        message: 'Appointment not found'
      }
    }

    // 5. Get staff data
    const { data: staff, error: staffError } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', appointment.staff_id)
      .single()

    const staffName = staff
      ? `${staff.first_name} ${staff.last_name}`
      : 'Ihr Fahrlehrer'

    // 6. Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, slug, primary_color')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      logger.warn('⚠️ Tenant not found:', tenantId)
      return {
        success: true,
        skipped: true,
        reason: 'tenant_not_found',
        message: 'Tenant not found'
      }
    }

    // 7. Get location data
    const { data: location } = await supabase
      .from('locations')
      .select('name')
      .eq('id', appointment.location_id)
      .single()

    // 8. Get payment data
    const payment = Array.isArray(appointment.payments)
      ? appointment.payments[0]
      : appointment.payments

    // 9. Format data for email
    const startTime = new Date(appointment.start_time)
    const appointmentDateTime = startTime.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const customerDashboard = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`
    const confirmationLink = customerDashboard // ✅ Simple dashboard link, no token needed
    const amount = payment ? `CHF ${(payment.total_amount_rappen / 100).toFixed(2)}` : 'CHF 0.00'

    // 10. Send email using centralized appointment notification endpoint
    logger.debug('📧 Calling send-appointment-notification endpoint...')

    try {
      const emailResponse = await $fetch('/api/email/send-appointment-notification', {
        method: 'POST',
        body: {
          email: user.email,
          studentName: `${user.first_name} ${user.last_name}`,
          appointmentTime: appointmentDateTime,
          type: 'appointment_confirmation',
          staffName,
          location: location?.name,
          tenantName: tenant.name,
          tenantId,
          tenantSlug: tenant.slug,
          amount,
          confirmationLink,
          customerDashboard
        }
      })

      logger.debug('✅ Appointment confirmation email sent:', emailResponse)
    } catch (emailError: any) {
      logger.error('EmailNotification', 'Failed to send appointment confirmation email:', emailError)
      // Don't fail the whole endpoint if email fails - log and continue
    }

    logger.debug('✅ Appointment confirmation email processed successfully')

    return {
      success: true,
      skipped: false,
      message: 'Appointment confirmation email sent successfully'
    }
  } catch (error: any) {
    logger.error('AppointmentConfirmation', 'Unexpected error:', error)

    return {
      success: false,
      error: error.message,
      message: 'Failed to send appointment confirmation (non-critical)'
    }
  }
})

