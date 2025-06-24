import { defineEventHandler, getCookie } from 'h3'

export default defineEventHandler(async (event) => {
  // Cookie mit Session-Token holen
  const sessionToken = getCookie(event, 'session_token')

  // Wenn kein Cookie → User nicht eingeloggt
  if (!sessionToken || sessionToken !== 'dummy-token') {
    return null
  }

  // Dummy-User-Daten – später aus DB holen!
  return {
    id: 1,
    email: 'test@coach.ch',
    role: 'staff',
    first_name: 'Test',
    last_name: 'Coach',
    assigned_staff_id: 2,
    phone: '0123456789',
    birthdate: '1990-01-01',
    street: 'Musterstrasse',
    street_nr: '1',
    zip: '8000',
    city: 'Zürich',
  }
})