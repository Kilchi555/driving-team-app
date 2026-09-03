// server/api/appointments/resend-confirmation.post.ts
// Resend appointment confirmation email (staff/admin of owning tenant).
// SEC-C03: auth required; confirmation tokens must NEVER appear in the response.

import { getSupabaseAdmin } from '~/utils/supabase'
import { logger } from '~/utils/logger'
import { requireAdminProfile } from '~/server/utils/auth'
import { dispatchAppointmentConfirmation } from '~/server/utils/dispatch-appointment-confirmation'

export default defineEventHandler(async (event) => {
  try {
    // SEC-C03 — Layer 1: Authentication + staff/admin/super_admin
    const profile = await requireAdminProfile(event)

    const body = await readBody(event)
    const { appointmentId } = body || {}

    if (!appointmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'appointmentId is required'
      })
    }

    const supabase = getSupabaseAdmin()

    // Load appointment — do not select confirmation_token into response path unnecessarily
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, user_id, tenant_id, confirmation_token, confirmation_email_status, confirmation_email_sent_at')
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Appointment not found'
      })
    }

    // SEC-C03 — Layer 2: Tenant isolation (super_admin may cross tenants)
    if (profile.role !== 'super_admin' && appointment.tenant_id !== profile.tenant_id) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden'
      })
    }

    if (!appointment.user_id || !appointment.tenant_id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Appointment is missing user or tenant'
      })
    }

    // Ensure a confirmation token exists for email/CTA links (never returned to client)
    if (!appointment.confirmation_token) {
      const newToken = crypto.randomUUID()
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          confirmation_token: newToken,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)

      if (updateError) throw updateError
    }

    // Force a true resend: clear prior delivery markers so dispatch can send again
    await supabase
      .from('appointments')
      .update({
        confirmation_email_sent_at: null,
        confirmation_email_status: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)

    const result = await dispatchAppointmentConfirmation({
      appointmentId: appointment.id,
      userId: appointment.user_id,
      tenantId: appointment.tenant_id,
    })

    // Never log tokens or confirmation links
    logger.debug('Appointment confirmation resend processed', {
      appointmentId: appointment.id,
      tenantId: appointment.tenant_id,
      success: result.success,
      skipped: result.skipped,
      reason: result.reason,
      emailSent: result.emailSent,
      emailQueued: result.emailQueued,
    })

    if (!result.success) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Failed to resend confirmation'
      })
    }

    // SEC-C03 invariant: no confirmationToken / confirmationLink in response
    return {
      success: true,
      skipped: !!result.skipped,
      reason: result.reason || null,
      emailSent: !!result.emailSent,
      emailQueued: !!result.emailQueued,
      message: result.message || 'Confirmation email processed',
    }
  } catch (error: any) {
    // Do not echo tokens or appointment PII in errors
    if (error?.statusCode) throw error
    console.error('❌ Error resending confirmation:', error?.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to resend confirmation'
    })
  }
})
