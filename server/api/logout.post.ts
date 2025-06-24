import { defineEventHandler, setCookie } from 'h3'

export default defineEventHandler(async (event) => {
  // Cookie löschen durch leeres Setzen mit Sofortablauf
  setCookie(event, 'session_token', '', {
    maxAge: 0,
    path: '/',
  })

  return { success: true }
})
