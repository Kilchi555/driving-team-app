// ============================================
// Send Appointment Confirmation Email
// ============================================
// Sendet die Bestätigungs-Email sofort nach Termin-Erstellung
// Mit Bestätigungs-Link und Zahlungsdetails

import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { logger } from '~/utils/logger'
import { sendPushToUser } from '~/server/utils/push'

const CUSTOMER_PORTAL_BASE_URL = (process.env.CUSTOMER_PORTAL_BASE_URL || 'https://app.simy.ch').replace(/\/$/, '')

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

    // 2. Load booking policy for this tenant
    const { data: tenantForPolicy } = await supabase
      .from('tenants')
      .select('booking_policy')
      .eq('id', tenantId)
      .maybeSingle()

    const confirmationEmailEnabled = (tenantForPolicy?.booking_policy as any)?.confirmation_email_enabled !== false

    // 2a. Admin disabled confirmation emails entirely
    if (!confirmationEmailEnabled) {
      logger.debug('⏭️ Confirmation emails disabled by tenant policy')
      return { success: true, skipped: true, reason: 'policy_disabled', message: 'Confirmation emails disabled by admin' }
    }

    // 2b. Check if user has email
    if (!user.email || user.email.trim() === '') {
      logger.debug('⏭️ User has no email yet, skipping appointment confirmation')
      return {
        success: true,
        skipped: true,
        reason: 'user_email_missing',
        message: 'User has no email, skipping confirmation'
      }
    }

    // 3. Check if user is still in onboarding (no email captured by staff yet)
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
        duration_minutes,
        event_type_code,
        type,
        staff_id,
        confirmation_token,
        location_id,
        customer_pickup_address,
        source,
        created_by,
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
      .select('first_name, last_name, email, phone')
      .eq('id', appointment.staff_id)
      .single()

    const staffName = staff
      ? `${staff.first_name} ${staff.last_name}`
      : 'Ihr Fahrlehrer'
    const staffPhone = (staff as any)?.phone || null

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
      .select('name, address, city')
      .eq('id', appointment.location_id)
      .single()

    // If this is a pickup booking, use the customer's pickup address as the location display
    const pickupAddress = (appointment as any).customer_pickup_address as string | null
    const locationDisplay = pickupAddress ? 'Pickup-Adresse' : location?.name
    const locationAddressDisplay = pickupAddress || [location?.address, location?.city].filter(Boolean).join(', ') || undefined

    // 7b. Get event type label from DB (fallback to code-based map)
    const EVENT_TYPE_LABELS: Record<string, string> = {
      lesson: 'Fahrstunde', exam: 'Prüfung', theory: 'Theorie', other: 'Termin'
    }
    let eventTypeName: string | undefined
    if (appointment.event_type_code) {
      const { data: etRow } = await supabase
        .from('event_types')
        .select('name')
        .eq('code', appointment.event_type_code)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      eventTypeName = etRow?.name
        || EVENT_TYPE_LABELS[appointment.event_type_code]
        || appointment.event_type_code
    }

    // Price is only relevant for standard billable event types
    const BILLABLE_TYPES = new Set(['lesson', 'exam', 'theory'])
    const LESSON_TYPES = new Set(['lesson', 'exam', 'theory'])
    const showPrice = !appointment.event_type_code
      || BILLABLE_TYPES.has(appointment.event_type_code)
    const isLessonType = !appointment.event_type_code
      || LESSON_TYPES.has(appointment.event_type_code)

    // 7c. Look up meeting_type from invited_customers (for non-lesson types like meetings)
    let meeting_type: 'in_person' | 'phone' | 'online' | undefined
    let meeting_link: string | undefined
    if (!isLessonType && user.email) {
      const { data: invite } = await supabase
        .from('invited_customers')
        .select('meeting_type, meeting_link')
        .eq('appointment_id', appointmentId)
        .ilike('email', user.email)
        .maybeSingle()
      if (invite) {
        meeting_type = (invite as any).meeting_type || undefined
        meeting_link = (invite as any).meeting_link || undefined
      }
    }

    // 8. Get payment data
    const payment = Array.isArray(appointment.payments)
      ? appointment.payments[0]
      : appointment.payments

    // 9. Format data for email
    const startTime = new Date(appointment.start_time)
    const endTime   = appointment.end_time ? new Date(appointment.end_time) : null
    const appointmentDateTime = startTime.toLocaleString('de-CH', {
      timeZone: 'Europe/Zurich',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Duration: prefer stored value, fall back to start/end diff
    const durationMinutes: number | undefined =
      appointment.duration_minutes
      || (endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : undefined)

    const customerDashboard = `${CUSTOMER_PORTAL_BASE_URL}/${tenant.slug}`
    const confirmationLink  = customerDashboard
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
          staffPhone,
          location: meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationDisplay,
          locationAddress: meeting_type === 'phone' || meeting_type === 'online' ? undefined : locationAddressDisplay,
          tenantName: tenant.name,
          tenantId,
          tenantSlug: tenant.slug,
          amount,
          confirmationLink,
          customerDashboard,
          userId,
          eventTypeName,
          durationMinutes,
          showPrice,
          isLessonType,
          meeting_type,
          meeting_link,
        }
      })

      logger.debug('✅ Appointment confirmation email sent:', emailResponse)
    } catch (emailError: any) {
      logger.error('EmailNotification', 'Failed to send appointment confirmation email:', emailError)
      // Don't fail the whole endpoint if email fails - log and continue
    }

    // 11. Send push notification to the student (fire-and-forget, non-blocking)
    sendPushToUser(userId, {
      title: '✅ Buchung bestätigt',
      body: `Deine Fahrstunde am ${appointmentDateTime} wurde bestätigt.`,
      data: { path: '/customer-dashboard' },
    }).catch((err: any) => {
      logger.warn('⚠️ Push notification failed (non-critical):', err.message)
    })

    // 12. Send staff notification – only for online bookings made by the customer (not manual)
    const isOnlineBooking = appointment.source === 'online' && appointment.created_by === userId
    if (staff?.email && isOnlineBooking) {
      $fetch('/api/email/send-appointment-notification', {
        method: 'POST',
        body: {
          email: staff.email,
          studentName: `${user.first_name} ${user.last_name}`,
          appointmentTime: appointmentDateTime,
          type: 'staff_new_booking',
          staffName,
          location: locationDisplay,
          locationAddress: locationAddressDisplay,
          tenantName: tenant.name,
          tenantId,
          tenantSlug: tenant.slug,
          amount,
          eventTypeName,
          durationMinutes,
          showPrice,
        }
      }).catch((err: any) => {
        logger.warn('⚠️ Could not send staff new booking notification (non-critical):', err.message)
      })
      logger.debug('📧 Staff new booking notification queued for:', staff.email)
    } else if (staff?.email && !isOnlineBooking) {
      logger.debug('⏭️ Skipping staff notification – manual appointment (source:', appointment.source, ')')
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

