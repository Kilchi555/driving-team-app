// server/api/email/send-appointment-notification.post.ts
// Thin auth wrapper — actual send lives in appointment-notification-email.ts

import { createError, defineEventHandler, readBody } from 'h3'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'
import {
  sendAppointmentNotificationEmail,
  type AppointmentNotificationBody,
} from '~/server/utils/appointment-notification-email'

export default defineEventHandler(async (event) => {
  try {
    await requireStaffOrInternal(event)
    const body = await readBody(event) as AppointmentNotificationBody
    const result = await sendAppointmentNotificationEmail(body)
    return {
      success: true,
      type: result.type,
      email: result.email,
      message: `${result.type} notification sent`,
    }
  } catch (error: any) {
    console.error('❌ Error sending appointment notification:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to send appointment notification',
    })
  }
})
