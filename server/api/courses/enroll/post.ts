/**
 * POST /api/courses/enroll
 *
 * Retired. Canonical enrollment is enroll-cash / enroll-wallee / admin enroll.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage:
      'This enrollment path has been retired. Use /api/courses/enroll-wallee, /api/courses/enroll-cash, or admin enrollment.',
  })
})
