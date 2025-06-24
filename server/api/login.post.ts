import { defineEventHandler, readBody, setCookie } from 'h3'
// import your DB client here, e.g. from Supabase or pg

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)

  if (!email || !password) {
    return {
      statusCode: 400,
      body: { error: 'Email und Passwort erforderlich' },
    }
  }

  // ⛔ MOCK: Dummy-Login, ersetzen mit echter DB-Abfrage!
  if (email === 'test@coach.ch' && password === 'test123') {
    // ✅ Session-Cookie setzen (1 Woche gültig)
    setCookie(event, 'session_token', 'dummy-token', {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return { success: true }
  }

  return {
    statusCode: 401,
    body: { error: 'Ungültige Anmeldedaten' },
  }
})
