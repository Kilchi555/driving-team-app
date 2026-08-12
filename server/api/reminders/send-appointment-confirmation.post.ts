// ============================================
// Send Appointment Confirmation Email (HTTP)
// ============================================
import { createError, defineEventHandler, readBody } from 'h3'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'
import { dispatchAppointmentConfirmation } from '~/server/utils/dispatch-appointment-confirmation'
import { logger } from '~/utils/logger'

export default defineEventHandler(async (event) => {
  await requireStaffOrInternal(event)
  try {
    const body = await readBody(event)
    const { appointmentId, userId, tenantId, skipStaffNotification } = body || {}

    if (!appointmentId || !userId || !tenantId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: appointmentId, userId, tenantId',
      })
    }

    return await dispatchAppointmentConfirmation({
      appointmentId,
      userId,
      tenantId,
      skipStaffNotification: !!skipStaffNotification,
    })
  } catch (error: any) {
    logger.error('AppointmentConfirmation', 'Unexpected error:', error)
    return {
      success: false,
      error: error.message,
      message: 'Failed to send appointment confirmation (non-critical)',
    }
  }
})
