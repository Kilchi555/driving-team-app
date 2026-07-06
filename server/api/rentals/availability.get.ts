/**
 * DEPRECATED – Replaced by /api/rentals/week-availability which returns a full 7-day view.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Dieser Endpunkt ist veraltet. Bitte /api/rentals/week-availability verwenden.',
  })
})
