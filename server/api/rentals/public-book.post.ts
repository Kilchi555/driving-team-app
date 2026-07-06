/**
 * DEPRECATED – Public booking without auth has been replaced by session-based booking.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Dieser Endpunkt ist veraltet. Buchungen erfordern ein Simy-Login.',
  })
})
