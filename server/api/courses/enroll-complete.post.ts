/**
 * POST /api/courses/enroll-complete
 *
 * Retired. Course registration after Wallee is created by the webhook,
 * not by this client-called completion endpoint.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage:
      'This enrollment path has been retired. Course enrollment is completed by the payment webhook. Use /api/courses/enroll-wallee or /api/courses/enroll-cash.',
  })
})
