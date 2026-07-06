/**
 * DEPRECATED – Magic-link auth has been replaced by Simy session login.
 */
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    statusMessage: 'Dieser Endpunkt ist veraltet. Bitte melde dich mit deinem Simy-Konto an.',
  })
})
