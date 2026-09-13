/**
 * POST /api/courses/enroll
 *
 * Retired. Canonical enrollment is enroll-cash / enroll-wallee / admin enroll.
 *
 * Nitro maps `*.post.ts` to the POST method. The sibling file
 * `enroll/post.ts` is a path segment (`/api/courses/enroll/post`), not this
 * route. Keep both 410 handlers.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage:
      'This enrollment path has been retired. Use /api/courses/enroll-wallee, /api/courses/enroll-cash, or admin enrollment.',
  })
})
